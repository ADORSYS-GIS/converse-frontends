'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  ApiKeysHygiene,
  BudgetPressureProject,
  BudgetPressureStatus,
  DashboardStatus,
  DateRangeFieldProps,
  DateRangePreset,
  OverviewStatCardData,
  RankedSeriesRow,
  SelectFieldProps,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import type { LatencyStatRow } from '@lightbridge/ui-web/src/sections/latency-stat-cards';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import {
  OVERVIEW_RANGES,
  SETTINGS_OVERVIEW_SELECTION_OPTIONS,
  useSettingsOverviewParams,
} from '../client/url-state';
import { apiKeysAccountFilters, apiKeysHygiene, apiKeysStatusSummary } from './api-key-rows';
import { microsToAmount } from './refill-rows';
import { isHomeAccount } from './account-ownership';
import {
  buildBudgetConsumptionByProjectRequest,
  degenerateChartMessage,
  isUsageResponseTruncated,
  RANGE_DAYS,
  resolveOverviewWindow,
  splitUnassignedProjects,
  toSpendShareSegments,
  toUrlDate,
  UNASSIGNED_KEY,
  type SeriesLabeller,
} from './overview-usage';
import {
  buildBurnDownRequest,
  buildLensDayRequest,
  buildLensTotalsRequest,
  lensTotals,
  toAggregateDaySeries,
  toLatencyRows,
  toRankedSeriesRows,
  type LensScopeTarget,
} from './settings-overview-usage';
import { sentinelLabel } from './sentinel-labels';

/**
 * `use-settings-overview-screen.ts` — the ONE hook behind all three `/settings/overview/*`
 * scope-parameterized analytics lenses (`account`/`project`/`user`; build brief §3). "Scope-
 * parameterized" is literal: `lens` selects one of the usage API's own `UsageScope` values (see
 * `settings-overview-usage.ts`'s module doc comment for the full mapping and why `'api_key'` has
 * no lens of its own in this build).
 *
 * Every zone below reads from the SAME `{scope, scopeId}` target, so the stat row, the spend
 * chart, the by-model ranking and the secondary breakdown can never disagree about what they are
 * describing — only their bucket width (day vs. whole-window) and group-by dimension differ.
 */

export type SettingsOverviewLens = 'account' | 'project' | 'user';

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};
const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: RANGE_DAYS[value],
}));

const LENS_LABEL: Record<SettingsOverviewLens, string> = {
  account: 'Account overview',
  project: 'Project overview',
  user: 'Your usage',
};

/** The secondary breakdown's own dimension per lens — `undefined` for the user lens, which has no
 *  natural sub-dimension of a single identity's own usage (build brief §3: only the project and
 *  account lenses get one). */
const SECONDARY_GROUP_BY: Record<SettingsOverviewLens, 'project_id' | 'api_key_id' | undefined> = {
  account: 'project_id',
  project: 'api_key_id',
  user: undefined,
};
const SECONDARY_LABEL: Record<SettingsOverviewLens, string> = {
  account: 'Spend by project',
  project: 'Spend by API key',
  user: '',
};

/**
 * How many API keys the admin hygiene block (account lens) reads in one page, and how many
 * projects the admin pressure (project lens) / hygiene zones resolve names against — MOVED here
 * verbatim from the deleted admin block in `use-overview-screen.ts` (coordinator directive:
 * "`/` becomes purely the account-scoped user dashboard — that is the point of the phase").
 * `ApiKey` carries `projectId`, never `accountId` (`authz.cstack:393-431`), so the account-wide
 * `apiKeys` fetch below is filtered indirectly, `projectId in [this account's own project ids]`
 * (`apiKeysAccountFilters`, Phase 2d account-scoping audit).
 */
const KEYS_PAGE_SIZE = 100;
const PROJECTS_PAGE_SIZE = 100;

/**
 * The budget-pressure zone's scope caveat, stated in the UI rather than only in a code comment —
 * MOVED here from `use-overview-screen.ts` alongside the query it captions (project lens, admin-
 * only now). There is no per-project budget ceiling anywhere in the authz schema, so what
 * `adminPressure` shows is each project's draw on the account's ONE ceiling, never a per-project
 * headroom.
 */
export const BUDGET_PRESSURE_SCOPE_NOTE =
  'Each bar is the project’s draw on the account’s single ceiling for this billing period. ' +
  'Projects have no ceiling of their own — a project’s quota is a governance tier, not a ' +
  'currency amount — so this ranks pressure, it does not report per-project headroom.';

/** The admin-only "Budget pressure" card's data — project lens only. */
export interface AdminPressureCard {
  projects: BudgetPressureProject[];
  /** `null` when no ceiling could be read — `BudgetPressure` then drops its meters entirely. */
  ceiling: number | null;
  status: BudgetPressureStatus;
  errorMessage?: string;
  onRetry: () => void;
  note: string;
}

/** The admin-only "Key hygiene" card's data — account lens only. */
export interface AdminHygieneCard {
  hygiene: ApiKeysHygiene;
  summary: string;
  /** Set only when the key listing was truncated — never left implicit. */
  caveat?: string;
}

export interface SecondaryBreakdown {
  label: string;
  rows: RankedSeriesRow[];
  status: DashboardStatus;
  errorMessage?: string;
  onRetry: () => void;
  /** Never a series (build brief §3): the excluded NULL-group share, stated as a caption instead. */
  unassignedCaption: string | null;
  /**
   * Set (instead of rendering `rows`) when this breakdown resolves to <=1 distinct value — a
   * one-row "breakdown" asserts a distribution the data does not have (build brief finish-item
   * §2, the same `degenerateChartMessage` decision the account overview's own SPEND chart uses).
   * Applies to every lens that carries a secondary breakdown (account: by project, project: by
   * API key). `undefined` once there is real distribution to show.
   */
  gatedMessage: string | undefined;
}

export interface SettingsOverviewScreen {
  lens: SettingsOverviewLens;
  title: string;
  subtitle: string | undefined;
  /** `false` for the project lens before a project is scoped — every zone below is disabled
   *  rather than fired unscoped. */
  ready: boolean;
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  /** Project lens only. */
  projectField: Omit<SelectFieldProps, 'layout'> | undefined;
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  spendSeries: SpendSeriesSeries[];
  spendStatus: DashboardStatus;
  spendErrorMessage?: string;
  spendRetry: () => void;
  spendTruncated: boolean;
  modelRows: RankedSeriesRow[];
  modelRowsStatus: DashboardStatus;
  modelRowsErrorMessage?: string;
  modelRowsRetry: () => void;
  selectedSeriesKey: string | null;
  setSelectedSeriesKey: (key: string | null) => void;
  /** `undefined` for the user lens — see `SECONDARY_GROUP_BY`'s own doc comment. */
  secondary: SecondaryBreakdown | undefined;
  latencyRows: LatencyStatRow[];
  latencyStatus: DashboardStatus;
  /** Account lens only. */
  burnDown:
    | { series: SpendSeriesSeries[]; ceiling: number | null; status: DashboardStatus }
    | undefined;
  /** Project lens, admin-only. `undefined` for a non-admin or any other lens — never a
   *  permanently-loading placeholder (the query never fires for either case). MOVED from
   *  `use-overview-screen.ts` (build brief §7). */
  adminPressure: AdminPressureCard | undefined;
  /** Account lens, admin-only. Same "undefined, never loading" contract as `adminPressure`. */
  adminHygiene: AdminHygieneCard | undefined;
}

export function useSettingsOverviewScreen(lens: SettingsOverviewLens): SettingsOverviewScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const isAdmin = session.isAdmin;
  const budgetClient = useConsoleBudgetClient();
  const [view, setView] = useSettingsOverviewParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const accountId = scope.value.accountId;
  const userId = session.user?.sub ?? '';

  const target: LensScopeTarget = useMemo(() => {
    if (lens === 'project') return { scope: 'project', scopeId: scope.value.projectId ?? '' };
    if (lens === 'user') return { scope: 'user', scopeId: userId };
    return { scope: 'account', scopeId: accountId };
  }, [lens, scope.value.projectId, userId, accountId]);

  const ready = Boolean(target.scopeId);

  const namesById = useMemo(
    () => new Map(scope.allProjects.map((project) => [project.id, project.name])),
    [scope.allProjects]
  );
  const labelForProject: SeriesLabeller = useMemo(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : namesById.get(key) || key),
    [namesById]
  );

  // ── the account/API-key label lookup for the project lens' own secondary breakdown ─────────
  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 100 },
    filters: target.scope === 'project' && target.scopeId
      ? [{ field: 'projectId', operator: 'eq', value: target.scopeId }]
      : [],
    queryOptions: { enabled: lens === 'project' && ready },
  });
  const apiKeyNamesById = useMemo(
    () => new Map(apiKeys.result.data.map((key) => [key.id, key.name])),
    [apiKeys.result.data]
  );
  const labelForApiKey: SeriesLabeller = useMemo(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : apiKeyNamesById.get(key) || key),
    [apiKeyNamesById]
  );

  const queryKeyBase = [
    'settings-overview',
    lens,
    target.scope,
    target.scopeId,
    view.range,
    view.from,
    view.to,
  ] as const;

  // ── the aggregate day-bucketed series: the spend chart AND (summed) the stat row's totals ──
  const dayQuery = useQuery({
    queryKey: [...queryKeyBase, 'day'],
    queryFn: () => queryUsage(buildLensDayRequest(target, window)),
    enabled: ready,
    staleTime: 30_000,
  });
  const spendStatus: DashboardStatus = dayQuery.isError
    ? 'error'
    : dayQuery.isPending
      ? 'loading'
      : 'ready';
  const spendSeries = useMemo(
    () => (dayQuery.data ? [toAggregateDaySeries(dayQuery.data, LENS_LABEL[lens])] : []),
    [dayQuery.data, lens]
  );

  // ── by-model breakdown (day-bucketed, for value + sparkline) ────────────────────────────────
  const modelDayQuery = useQuery({
    queryKey: [...queryKeyBase, 'model-day'],
    queryFn: () => queryUsage(buildLensDayRequest(target, window, 'model')),
    enabled: ready,
    staleTime: 30_000,
  });
  const modelRowsStatus: DashboardStatus = modelDayQuery.isError
    ? 'error'
    : modelDayQuery.isPending
      ? 'loading'
      : 'ready';
  const modelRows = useMemo(
    () => (modelDayQuery.data ? toRankedSeriesRows(modelDayQuery.data, 'model') : []),
    [modelDayQuery.data]
  );

  // ── per-model latency (whole-window bucket — percentiles cannot be validly combined across
  // several day buckets, see `settings-overview-usage.ts`'s own doc comment) ──────────────────
  const modelTotalsQuery = useQuery({
    queryKey: [...queryKeyBase, 'model-totals'],
    queryFn: () => queryUsage(buildLensTotalsRequest(target, window, 'model')),
    enabled: ready,
    staleTime: 30_000,
  });
  const latencyStatus: DashboardStatus = modelTotalsQuery.isError
    ? 'error'
    : modelTotalsQuery.isPending
      ? 'loading'
      : 'ready';
  const latencyRows = useMemo(
    () => (modelTotalsQuery.data ? toLatencyRows(modelTotalsQuery.data) : []),
    [modelTotalsQuery.data]
  );

  // ── secondary breakdown — by project (account lens) or by API key (project lens); none for
  // the user lens (`SECONDARY_GROUP_BY`) ──────────────────────────────────────────────────────
  const secondaryGroupBy = SECONDARY_GROUP_BY[lens];
  const secondaryQuery = useQuery({
    queryKey: [...queryKeyBase, 'secondary', secondaryGroupBy],
    queryFn: () =>
      queryUsage(buildLensDayRequest(target, window, secondaryGroupBy as 'project_id' | 'api_key_id')),
    enabled: ready && secondaryGroupBy !== undefined,
    staleTime: 30_000,
  });
  const secondaryStatus: DashboardStatus = secondaryQuery.isError
    ? 'error'
    : secondaryQuery.isPending
      ? 'loading'
      : 'ready';

  const secondary = useMemo<SecondaryBreakdown | undefined>(() => {
    if (secondaryGroupBy === undefined) return undefined;

    const labelFor = secondaryGroupBy === 'project_id' ? labelForProject : labelForApiKey;
    const rawRows = secondaryQuery.data ? toRankedSeriesRows(secondaryQuery.data, secondaryGroupBy, labelFor) : [];
    // NULL group keys are never a series (build brief §3) — every secondary breakdown drops the
    // unassigned bucket and states its share as a caption instead.
    const { segments: rows, unassignedCaption } =
      secondaryGroupBy === 'project_id' ? splitUnassignedProjects(rawRows) : { segments: rawRows, unassignedCaption: null };

    // <=1 distinct value in this breakdown is degenerate, not a genuinely empty result (build
    // brief finish-item §2) — the SAME shared decision the account overview's own SPEND chart
    // uses (`overview-usage.ts`'s `degenerateChartMessage`), applied to BOTH lenses that carry a
    // secondary breakdown now (account: by project, project: by API key), not just the account
    // one. No extra query: `rows`/`unassignedCaption` are the SAME response already fetched.
    const dimensionNoun = secondaryGroupBy === 'project_id' ? 'project' : 'API key';
    const gatedMessage =
      secondaryStatus === 'ready'
        ? degenerateChartMessage(rows, dimensionNoun, unassignedCaption)
        : undefined;

    return {
      label: SECONDARY_LABEL[lens],
      rows: gatedMessage ? [] : rows,
      status: secondaryStatus,
      errorMessage: secondaryQuery.isError ? getUsageErrorMessage(secondaryQuery.error) : undefined,
      onRetry: () => void secondaryQuery.refetch(),
      unassignedCaption,
      gatedMessage,
    };
  }, [
    secondaryGroupBy,
    secondaryQuery.data,
    secondaryQuery.isError,
    secondaryQuery.error,
    secondaryStatus,
    labelForProject,
    labelForApiKey,
    lens,
  ]);

  // ── account lens: the cumulative budget burn-down + its ceiling. The SAME ceiling also feeds
  // the project lens' admin-only BudgetPressure card below (`balanceQuery` widened to fire for
  // either lens, rather than a second balance query) ──────────────────────────────────────────
  const period = useMemo(() => currentBudgetPeriod(), []);
  const accountIsHome = isHomeAccount(accountId, session);

  const burnDownQuery = useQuery({
    queryKey: ['usage', 'settings-overview-burn-down', accountId, period],
    queryFn: () => queryUsage(buildBurnDownRequest(accountId, new Date())),
    enabled: lens === 'account' && Boolean(accountId),
    staleTime: 30_000,
  });
  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    // Account lens: every user (the burn-down's own ceiling). Project lens: admin only (the
    // BudgetPressure card's ceiling) — a non-admin on the project lens never fires this.
    enabled:
      (lens === 'account' || (lens === 'project' && isAdmin)) &&
      Boolean(accountId) &&
      accountIsHome,
    staleTime: 30_000,
  });

  // ── project lens, admin-only: budget pressure — the account-wide per-project draw on the SAME
  // ceiling `balanceQuery` above already reads (MOVED from `use-overview-screen.ts`, build brief
  // §7 — "BudgetPressure → project lens"). Always account-wide, never narrowed to the ONE project
  // this lens' own picker has scoped: an operator's cross-account-project picture is exactly the
  // narrowing this card exists to refuse (kept verbatim from the deleted `use-admin-overview-
  // screen.ts`'s original argument). ──────────────────────────────────────────────────────────
  const pressureQuery = useQuery({
    queryKey: ['usage', 'budget-consumption-by-project', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionByProjectRequest(accountId, new Date())),
    enabled: lens === 'project' && Boolean(accountId) && isAdmin,
    staleTime: 30_000,
  });
  const pressureProjects = useMemo<BudgetPressureProject[]>(
    () =>
      pressureQuery.data
        ? toSpendShareSegments(pressureQuery.data, 'project_id', labelForProject).map((segment) => ({
            key: segment.key,
            name: segment.label,
            spend: segment.value,
          }))
        : [],
    [pressureQuery.data, labelForProject]
  );
  const pressureStatus: BudgetPressureStatus = pressureQuery.isError
    ? 'error'
    : pressureQuery.isPending
      ? 'loading'
      : 'ready';
  const pressureCeiling = accountIsHome && balanceQuery.data
    ? microsToAmount(balanceQuery.data.effectiveBudgetMicros)
    : null;

  // ── account lens, admin-only: key hygiene, account-wide (every project, not only the scoped
  // one) — MOVED from `use-overview-screen.ts` (build brief §7 — "ApiKeysHygieneNotes → account
  // lens"). Phase 2d (account-scoping audit, converse-frontends#368/#392): `apiKeys` is filtered
  // server-side to `projectId in […]`, not an identity-wide fetch re-filtered client-side. ─────
  const adminProjects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: PROJECTS_PAGE_SIZE },
    filters: accountId ? [{ field: 'accountId', operator: 'eq', value: accountId }] : [],
    queryOptions: { enabled: lens === 'account' && isAdmin },
  });
  const adminAccountProjectIds = useMemo(
    () => adminProjects.result.data.map((project) => project.id),
    [adminProjects.result.data]
  );
  const adminApiKeysFilters = apiKeysAccountFilters({
    projectId: null,
    accountProjectIds: adminAccountProjectIds,
  });
  const adminApiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: KEYS_PAGE_SIZE },
    filters: adminApiKeysFilters ?? [],
    // Never fires while `adminProjects` itself is still resolving (or the account genuinely has
    // no projects, hence no keys) — an unfiltered fetch here is exactly the defect Phase 2d closed.
    queryOptions: { enabled: lens === 'account' && isAdmin && adminApiKeysFilters !== null },
  });
  const accountKeys = adminApiKeys.result.data;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and an
  // "expires in N days" count is relative to when the listing was read.
  const adminKeysReadAt = adminApiKeys.query.dataUpdatedAt;
  const adminKeysTotal = adminApiKeys.result.total ?? adminApiKeys.result.data.length;

  const burnDown = useMemo(() => {
    if (lens !== 'account') return undefined;
    const status: DashboardStatus =
      burnDownQuery.isError || (accountIsHome && balanceQuery.isError)
        ? 'error'
        : burnDownQuery.isPending || (accountIsHome && balanceQuery.isPending)
          ? 'loading'
          : 'ready';
    const series = burnDownQuery.data ? [toAggregateDaySeries(burnDownQuery.data, 'This account')] : [];
    const ceiling =
      accountIsHome && balanceQuery.data ? microsToAmount(balanceQuery.data.effectiveBudgetMicros) : null;
    return { series, ceiling, status };
  }, [
    lens,
    burnDownQuery.isError,
    burnDownQuery.isPending,
    burnDownQuery.data,
    accountIsHome,
    balanceQuery.isError,
    balanceQuery.isPending,
    balanceQuery.data,
  ]);

  // ── stat row: requests / cost / cost-per-request, from the same day-bucketed response the
  // spend chart already reads (summing cost/requests across buckets is always valid, unlike a
  // percentile — see `settings-overview-usage.ts`) ────────────────────────────────────────────
  const statCards = useMemo<OverviewStatCardData[]>(() => {
    if (!dayQuery.data) return [];
    const totals = lensTotals(dayQuery.data);
    return [
      { key: 'requests', label: 'Requests', metric: totals.requests.toLocaleString() },
      { key: 'cost', label: 'Cost', metric: formatUsd(totals.cost) },
      { key: 'cost-per-request', label: 'Cost / request', metric: formatUsd(totals.costPerRequest) },
    ];
  }, [dayQuery.data]);

  // ── subtitle: which account/project/identity this lens is looking at ───────────────────────
  const subtitle = useMemo(() => {
    if (lens === 'account') {
      const account = scope.allAccounts.find((a) => a.id === accountId);
      return account ? account.name || sentinelLabel(account.id).label : undefined;
    }
    if (lens === 'project') {
      if (!target.scopeId) return 'No project selected';
      const project = scope.projects.find((p) => p.id === target.scopeId);
      return project?.label ?? sentinelLabel(target.scopeId).label;
    }
    return sentinelLabel(userId, session.user?.name || session.user?.preferredUsername).label;
  }, [lens, scope.allAccounts, scope.projects, accountId, target.scopeId, userId, session.user]);

  return {
    lens,
    title: LENS_LABEL[lens],
    subtitle,
    ready,
    rangeField: {
      label: 'Range',
      presets: RANGE_PRESETS,
      preset: view.from && view.to ? null : view.range,
      value: { from: window.start, to: window.end },
      onPresetChange: (range) => {
        void setView({ range: range as (typeof OVERVIEW_RANGES)[number], from: '', to: '' });
      },
      onRangeChange: ({ from, to }) => {
        void setView({ from: toUrlDate(from), to: toUrlDate(to) });
      },
    },
    projectField:
      lens === 'project'
        ? {
            label: 'Project',
            value: scope.value.projectId ?? '',
            options: [
              { value: '', label: 'Select a project…' },
              ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
            ],
            onChange: (projectId) =>
              scope.setValue({ accountId: scope.value.accountId, projectId: projectId || null }),
          }
        : undefined,
    statCards,
    statCardsLoading: dayQuery.isPending,
    spendSeries,
    spendStatus,
    spendErrorMessage: dayQuery.isError ? getUsageErrorMessage(dayQuery.error) : undefined,
    spendRetry: () => void dayQuery.refetch(),
    spendTruncated: dayQuery.data ? isUsageResponseTruncated(dayQuery.data) : false,
    modelRows,
    modelRowsStatus,
    modelRowsErrorMessage: modelDayQuery.isError ? getUsageErrorMessage(modelDayQuery.error) : undefined,
    modelRowsRetry: () => void modelDayQuery.refetch(),
    selectedSeriesKey: view.series || null,
    setSelectedSeriesKey: (series) => {
      void setView({ series: series ?? '' }, SETTINGS_OVERVIEW_SELECTION_OPTIONS);
    },
    secondary,
    latencyRows,
    latencyStatus,
    burnDown,
    adminPressure:
      lens === 'project' && isAdmin
        ? {
            projects: pressureProjects,
            ceiling: pressureCeiling,
            status: pressureStatus,
            errorMessage: pressureQuery.isError
              ? getUsageErrorMessage(pressureQuery.error)
              : undefined,
            onRetry: () => void pressureQuery.refetch(),
            note: BUDGET_PRESSURE_SCOPE_NOTE,
          }
        : undefined,
    adminHygiene:
      lens === 'account' && isAdmin
        ? {
            hygiene: apiKeysHygiene(accountKeys, adminKeysReadAt),
            summary: apiKeysStatusSummary(accountKeys, adminKeysReadAt),
            // The listing IS scoped to this account's own projects server-side
            // (`adminApiKeysFilters`, Phase 2d) — the only remaining truncation is genuine
            // pagination: an account holding more than `KEYS_PAGE_SIZE` keys has more beyond
            // this one page.
            caveat:
              adminKeysTotal > adminApiKeys.result.data.length
                ? `Counted over the first ${adminApiKeys.result.data.length} of ${adminKeysTotal} keys in this account — the rest are beyond this page.`
                : undefined,
          }
        : undefined,
  };
}
