'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  ApiKeysHygiene,
  BudgetPressureProject,
  BudgetPressureStatus,
  BudgetSummary,
  DashboardStatus,
  ShareBarSegment,
  OverviewStatCardData,
  DateRangeFieldProps,
  DateRangePreset,
  ReportExportDialogProps,
  ReportExportParams,
  SelectFieldProps,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useSharedMutation } from '../client/use-shared-mutation';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import {
  OVERVIEW_BUCKETS,
  OVERVIEW_GROUP_BYS,
  OVERVIEW_RANGES,
  OVERVIEW_SELECTION_OPTIONS,
  REPORT_FORMATS,
  REPORT_INCLUDE_IDS,
  useOverviewParams,
  type ReportIncludeId,
} from '../client/url-state';
import { apiKeysHygiene, apiKeysStatusSummary } from './api-key-rows';
import { downloadBlob, filenameFromContentDisposition } from './download-file';
import { microsToAmount } from './refill-rows';
import { useRefillsQueueScreen } from './use-refills-queue-screen';
import {
  smallestAllowedAmountMicros,
  useBudgetRefillLadder,
  useOverviewRefillOutcome,
} from './use-budget-refill';
import { useOpenRequestRefillDialog } from './use-request-refill-dialog';
import {
  activeApiKeysCountFilters,
  buildBudgetConsumptionByProjectRequest,
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  sumTotalCost,
  toSpendSeries,
  resolveOverviewWindow,
  UNASSIGNED_KEY,
  toSpendShareSegments,
  toUrlDate,
  type SeriesLabeller,
  RANGE_DAYS,
} from './overview-usage';

/**
 * `/` — one dashboard, parameterised by role (shell revamp phase 4). The centre (`overview-
 * centre.tsx`) is the ONLY caller now: the deleted `/admin?section=overview` used to duplicate a
 * large slice of this adapter (`use-admin-overview-screen.ts`, removed by this phase) for a
 * dashboard that differed only in SCOPE — always account-wide, never narrowed by the project
 * filter — and in the extra zones an operator needs. Rather than two screens that could drift
 * (and did: the admin one alone carried the `BUDGET_PRESSURE_SCOPE_NOTE` honesty contract), this
 * hook now absorbs those operator queries directly, gated behind `session.isAdmin`.
 *
 * **What is real here.** The per-user half — project/API-key counts, SPEND/SPEND SHARE/SPEND BY
 * MODEL, BudgetHero consumption-vs-ceiling, the refill control, and now Export — matches what `/`
 * already did. Layered on top, ADMIN-ONLY and firing NO extra query for a non-admin: the
 * per-project budget-pressure query feeding `adminPressure`, an account-wide API-key listing
 * feeding `adminHygiene`, and the pending-refill queue (`useRefillsQueueScreen`, shared by query key with
 * `/admin`'s own review centre and the sidebar's nav count) feeding `refillRequestStatus`. Every
 * admin-only query below passes its own `enabled: … && isAdmin` (or, for `useRefillsQueueScreen`, its own
 * `enabled` parameter) rather than relying on the caller never mounting for a non-admin — `/`
 * mounts for everyone.
 *
 * The admin zones are always ACCOUNT-WIDE, never narrowed by `scope.value.projectId`: a project
 * filter on an operator's cross-account picture is exactly the narrowing those zones exist to
 * refuse (the same argument `use-admin-overview-screen.ts` made before this merge).
 *
 * **LATENCY is gone (phase 9.2, 2026-08-30 owner directive).** The usage backend's events are
 * aggregate metric signals with no per-request duration — `toLatencySeries`'s own per-series
 * honesty logic (deleted with it) existed only because that panel could never genuinely fill.
 * SPEND BY MODEL (`modelSpendSegments`) replaces it: a real breakdown the backend can actually
 * answer, scoped identically to the per-user SPEND query below so the two can never disagree about
 * the period.
 */

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

// Self-describing option words (phase 9 — the toolbar's own external "Bucket"/"Group by" labels
// are gone; each select's chosen option now has to read on its own, e.g. "Daily" rather than a
// bare "Day" beside a label that used to say what axis it was).
const BUCKET_LABELS: Record<(typeof OVERVIEW_BUCKETS)[number], string> = {
  hour: 'Hourly',
  day: 'Daily',
  week: 'Weekly',
};

const GROUP_BY_LABELS: Record<(typeof OVERVIEW_GROUP_BYS)[number], string> = {
  project: 'By project',
  model: 'By model',
};

const REPORT_INCLUDE_LABELS: Record<ReportIncludeId, string> = {
  totals: 'Totals row',
  'per-model': 'Per-model breakdown',
};

// The option lists are derived from the URL contract's own literal unions rather than declared
// beside it: a value the toolbar can offer but the parser would reject is exactly the drift ADR
// 0011 makes the contract module responsible for preventing. `GROUP_BY_OPTIONS` doubles as the
// Export dialog's `groupByOptions` — the report's grouping and the dashboard's are the same
// vocabulary (`url-state.ts`'s own `overviewParsers.reportGroupBy` doc comment).
const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: RANGE_DAYS[value],
}));
const BUCKET_OPTIONS = OVERVIEW_BUCKETS.map((value) => ({ value, label: BUCKET_LABELS[value] }));
const GROUP_BY_OPTIONS = OVERVIEW_GROUP_BYS.map((value) => ({
  value,
  label: GROUP_BY_LABELS[value],
}));

/** Matches `Meter`'s own default (`packages/ui-web/src/components/meter/component.tsx`) — the
 *  account-level refill control only appears once the SAME ratio that turns the meter `--signal`
 *  is crossed, so the control and the visual breach cue always agree. */
const BUDGET_BREACH_THRESHOLD = 0.9;

/** Same idiom, for the Export dialog's own mutation (ticket #309's pattern, now shared by `/` and
 *  `/projects`). */
const REPORT_MUTATION_KEY = ['overview', 'report'] as const;

/**
 * How many API keys the admin hygiene block reads in one page, and how many projects the admin
 * pressure/hygiene zones resolve names against — lifted verbatim from the deleted
 * `use-admin-overview-screen.ts`. See that file's own `KEYS_PAGE_SIZE` doc comment (git history)
 * for why `listApiKeys` has to be paged and matched against the account's own project ids rather
 * than filtered directly: `ApiKey` carries `projectId`, never `accountId`.
 */
const KEYS_PAGE_SIZE = 100;
const PROJECTS_PAGE_SIZE = 100;

/**
 * The budget-pressure zone's scope caveat, stated in the UI rather than only in a code comment —
 * kept verbatim from the deleted `use-admin-overview-screen.ts`; see its git history for the full
 * argument. There is no per-project budget ceiling anywhere in the authz schema, so what `
 * adminPressure` shows is each project's draw on the account's ONE ceiling, never a per-project
 * headroom.
 */
export const BUDGET_PRESSURE_SCOPE_NOTE =
  'Each bar is the project’s draw on the account’s single ceiling for this billing period. ' +
  'Projects have no ceiling of their own — a project’s quota is a governance tier, not a ' +
  'currency amount — so this ranks pressure, it does not report per-project headroom.';

/** The admin-only "Budget pressure" card's data. */
export interface AdminPressureCard {
  projects: BudgetPressureProject[];
  /** `null` when no ceiling could be read — `BudgetPressure` then drops its meters entirely. */
  ceiling: number | null;
  status: BudgetPressureStatus;
  errorMessage?: string;
  onRetry: () => void;
  note: string;
}

/** The admin-only "Key hygiene" card's data. */
export interface AdminHygieneCard {
  hygiene: ApiKeysHygiene;
  summary: string;
  /** Set only when the key listing was truncated — never left implicit. */
  caveat?: string;
}

export interface OverviewScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle` — see
   *  `scopeProjectLabel`'s own doc for the project half of the pair. `undefined` before an
   *  account resolves. */
  scopeAccountLabel: string | undefined;
  scopeProjectLabel: string;
  subline: string;
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  selectedSeriesKey: string | null;
  setSelectedSeriesKey: (key: string | null) => void;
  // `Omit<…, 'layout'>`: the toolbar owns the layout axis, the screen owns the values.
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  bucketField: Omit<SelectFieldProps, 'layout'>;
  groupByField: Omit<SelectFieldProps, 'layout'>;
  projectField: Omit<SelectFieldProps, 'layout'>;
  // ── #305: SPEND / SPEND SHARE ────────────────────────────────────────────────────────────
  spendSeries: SpendSeriesSeries[];
  spendSegments: ShareBarSegment[];
  spendStatus: DashboardStatus;
  spendErrorMessage?: string;
  spendRetry: () => void;
  // ── phase 9.2: SPEND BY MODEL — a second aggregate view of the SAME scope/period as SPEND
  // above (never a separately-scoped query, so the two cards can never disagree), grouped by
  // model rather than whatever the toolbar's own `groupByField` currently holds. Replaces the
  // deleted LATENCY panel (see this module's own doc comment). ─────────────────────────────
  modelSpendSegments: ShareBarSegment[];
  modelSpendStatus: DashboardStatus;
  modelSpendErrorMessage?: string;
  modelSpendRetry: () => void;
  // ── #306: BudgetHero consumption vs ceiling + the inline refill control ─────────────────
  budget: BudgetSummary;
  /** Only defined once the account itself is breached (`BUDGET_BREACH_THRESHOLD`) AND the active
   *  policy currently offers an amount — `BudgetHero.action`'s own "only present once breached"
   *  convention (see `budget-hero/types.ts`). */
  refillAction: { label: string; onClick: () => void; pending: boolean } | undefined;
  refillErrorMessage: string | undefined;
  // ── phase 4: `Export` — `PageHeader.action`, defaults from this screen's own params ──────
  report: ReportExportDialogProps;
  // ── phase 4: role-parameterised — undefined for a non-admin, never a permanently-loading
  // placeholder (these queries never fire for one; see this module's own doc comment) ───────
  isAdmin: boolean;
  adminPressure: AdminPressureCard | undefined;
  adminHygiene: AdminHygieneCard | undefined;
  /** Omitted entirely when nothing is pending — mirrors `BudgetPanel.refillRequestStatus`'s own
   *  "no empty placeholder" convention. */
  refillRequestStatus: { pendingCount: number; submittedLabel: string } | undefined;
}

export function useOverviewScreen(scopeSlot: ReactNode): OverviewScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const [view, setView] = useOverviewParams();
  const budgetClient = useConsoleBudgetClient();
  const isAdmin = session.isAdmin;

  // One resolution, read by both the query and the picker's displayed value — so the calendar can
  // never show a span different from the one that was actually fetched.
  const usageWindow = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const projects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.accountId
      ? [{ field: 'accountId', operator: 'eq', value: scope.value.accountId }]
      : [],
  });

  // See `activeApiKeysCountFilters`'s own doc comment (live findings #5, 2026-08-30) — this used
  // to be an unfiltered count and included revoked keys.
  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: activeApiKeysCountFilters(scope.value.projectId),
  });

  const scopeProjectLabel =
    scope.projects.find((project) => project.id === scope.value.projectId)?.label ?? 'All projects';
  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);
  const scopeAccountLabel = activeAccount ? accountScopeLabel(activeAccount) : undefined;

  const accountId = scope.value.accountId;
  const projectId = scope.value.projectId;

  // ── #305: SPEND / SPEND SHARE ──────────────────────────────────────────────────────────────
  const usageQuery = useQuery({
    queryKey: [
      'usage',
      'overview',
      accountId,
      projectId,
      view.range,
      view.bucket,
      view.groupBy,
      view.model,
      view.from,
      view.to,
    ],
    queryFn: () =>
      queryUsage(
        buildOverviewUsageRequest({
          accountId,
          projectId,
          window: usageWindow,
          bucket: view.bucket,
          groupBy: view.groupBy,
          model: view.model,
        })
      ),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const spendStatus: DashboardStatus = usageQuery.isError
    ? 'error'
    : usageQuery.isPending
      ? 'loading'
      : 'ready';

  // The usage backend groups by `project_id`, so every series comes back keyed by an opaque id.
  // The console already knows the names — `scope.allProjects` is loaded for the project picker —
  // so resolve them here rather than printing `zezxvt21irmoi0kzm22el7gu` on the chart legend and
  // the share list (owner, 2026-08-29). Model keys are already human-readable, so they pass
  // through; an id with no matching project does too, which is the honest fallback for a project
  // deleted since the usage was recorded.
  //
  // `labelForProject` resolves a project id regardless of the dashboard's own `groupBy` — the
  // admin-only pressure zone below is always grouped by project, independent of what the user's
  // own SPEND chart is currently grouped by, so it needs the unconditional mapping rather than
  // `labelForSeries`'s groupBy-gated one.
  const namesById = useMemo(
    () => new Map(scope.allProjects.map((project) => [project.id, project.name])),
    [scope.allProjects]
  );
  const labelForProject = useMemo<SeriesLabeller>(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : namesById.get(key) || key),
    [namesById]
  );
  const labelForSeries = useMemo<SeriesLabeller>(
    () => (view.groupBy === 'project' ? labelForProject : (key) => key),
    [view.groupBy, labelForProject]
  );

  // Model keys are already human-readable, so no id->name lookup is needed the way
  // `labelForProject` needs one — only the `UNASSIGNED_KEY` sentinel gets a friendlier label.
  const labelForModel = useMemo<SeriesLabeller>(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : key),
    []
  );

  const spendSeries = useMemo(
    () => (usageQuery.data ? toSpendSeries(usageQuery.data, view.groupBy, labelForSeries) : []),
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const spendSegments = useMemo(
    () =>
      usageQuery.data ? toSpendShareSegments(usageQuery.data, view.groupBy, labelForSeries) : [],
    [usageQuery.data, view.groupBy, labelForSeries]
  );

  // ── phase 9.2: SPEND BY MODEL — scoped EXACTLY like the query above (same accountId/
  // projectId/window/model filter), forcing `groupBy: 'model'` regardless of what the toolbar's
  // own `groupByField` currently holds, so this card can never disagree with SPEND/SPEND BY
  // PROJECT about the period. A separate query (not a client-side re-slice of `usageQuery.data`)
  // because the backend, not the client, owns the grouping dimension — the same reason SPEND
  // itself is re-fetched rather than re-sliced whenever `view.groupBy` changes.
  const modelUsageQuery = useQuery({
    queryKey: [
      'usage',
      'overview-by-model',
      accountId,
      projectId,
      view.range,
      view.bucket,
      view.model,
      view.from,
      view.to,
    ],
    queryFn: () =>
      queryUsage(
        buildOverviewUsageRequest({
          accountId,
          projectId,
          window: usageWindow,
          bucket: view.bucket,
          groupBy: 'model',
          model: view.model,
        })
      ),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const modelSpendStatus: DashboardStatus = modelUsageQuery.isError
    ? 'error'
    : modelUsageQuery.isPending
      ? 'loading'
      : 'ready';

  const modelSpendSegments = useMemo(
    () =>
      modelUsageQuery.data
        ? toSpendShareSegments(modelUsageQuery.data, 'model', labelForModel)
        : [],
    [modelUsageQuery.data, labelForModel]
  );

  // ── #306: BudgetHero — consumption (usage backend, this billing period) vs ceiling (budget
  // microservice's own `getMyBudgetBalance`) ────────────────────────────────────────────────
  // Resolved once per mount, not per render (same "moving default, resolved once" pattern
  // `url-state.ts`'s own `CURRENT_PERIOD` uses at module load) — a calendar-month period changes
  // at most once a session, and this keeps the budget queries' keys stable across re-renders.
  const period = useMemo(() => currentBudgetPeriod(), []);

  const consumptionQuery = useQuery({
    queryKey: ['usage', 'budget-consumption', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  // The ladder query and the refill mutation itself both moved to `use-budget-refill.ts` (rail-
  // return round, 2026-08-30) so `RequestRefillDialog` — mounted once in the layout — can drive
  // the exact same query/mutation this screen only READS from now: `refillErrorMessage` stays
  // visible here via the shared `MutationCache` (`useOverviewRefillOutcome`) even though the
  // actual submit happens inside the dialog, the same "two zones, one shared outcome" idiom
  // `use-refills-queue-screen.ts`'s `DECIDE_MUTATION_KEY` already documents.
  const ladder = useBudgetRefillLadder();
  const refillOutcome = useOverviewRefillOutcome();
  const openRefillDialog = useOpenRequestRefillDialog();

  const budget: BudgetSummary = useMemo(() => {
    if (consumptionQuery.isError) {
      return {
        status: 'error',
        errorMessage: getUsageErrorMessage(consumptionQuery.error),
        onRetry: () => void consumptionQuery.refetch(),
      };
    }
    if (balanceQuery.isError) {
      return {
        status: 'error',
        errorMessage: 'Failed to load the account budget ceiling.',
        onRetry: () => void balanceQuery.refetch(),
      };
    }
    if (consumptionQuery.isPending || balanceQuery.isPending) {
      return { status: 'loading' };
    }
    const value = sumTotalCost(consumptionQuery.data);
    const ceiling = microsToAmount(balanceQuery.data.effectiveBudgetMicros);
    const percent = ceiling > 0 ? Math.round((value / ceiling) * 100) : 0;
    return {
      value,
      ceiling,
      threshold: BUDGET_BREACH_THRESHOLD,
      caption: `account ceiling · ${percent}% used this period`,
    };
  }, [
    consumptionQuery.isError,
    consumptionQuery.isPending,
    consumptionQuery.data,
    consumptionQuery.error,
    balanceQuery.isError,
    balanceQuery.isPending,
    balanceQuery.data,
    balanceQuery.error,
  ]);

  // `'value' in budget` narrows to the `'ready'` branch (the only one carrying `value`/`ceiling`)
  // without a `status` comparison the compiler can't fully discriminate on here.
  const isBreached =
    'value' in budget && 'ceiling' in budget && budget.ceiling > 0
      ? budget.value / budget.ceiling >= BUDGET_BREACH_THRESHOLD
      : false;

  const smallestAmountMicros = isBreached
    ? smallestAllowedAmountMicros(ladder.allowedAmountsMicros)
    : null;

  // 2026-08-30 (owner: "budget refill form disappeared") — this used to instantly mutate
  // `smallestAmountMicros` on one click, with no confirmation surface at all. It now opens
  // `RequestRefillDialog` instead (which independently preselects the smallest allowed amount —
  // see `use-request-refill-dialog.ts`), so a breach is still one click away from a refill
  // request, but that click is a real form, not a blind mutate.
  let refillAction: OverviewScreen['refillAction'];
  if (smallestAmountMicros) {
    refillAction = {
      label: 'Request refill',
      onClick: openRefillDialog,
      pending: refillOutcome.isPending,
    };
  }

  // ── phase 4: money-first stat row — spend leads, budget remaining next (omitted while no
  // ceiling can be read), then the existing counts. Never a fabricated figure: SPEND is an em
  // dash while the period query is unresolved, and BUDGET REMAINING is dropped entirely rather
  // than guessed at (see `OverviewStatRow`'s own contract). ──────────────────────────────────
  const statCards = useMemo<OverviewStatCardData[]>(() => {
    const cards: OverviewStatCardData[] = [
      {
        key: 'spend',
        label: 'Spend this period',
        metric: consumptionQuery.data ? formatUsd(sumTotalCost(consumptionQuery.data)) : '—',
      },
    ];
    if ('value' in budget && 'ceiling' in budget) {
      cards.push({
        key: 'budget-remaining',
        label: 'Budget remaining',
        metric: formatUsd(budget.ceiling - budget.value),
      });
    }
    cards.push(
      {
        key: 'keys',
        label: 'Active API keys',
        metric: String(apiKeys.result.total ?? 0),
        // No `sparklineData` — there is no trend series behind a key COUNT, and `OverviewStatRow`
        // renders no sparkline slot at all when it's omitted, rather than an empty/flat
        // decorative line.
      },
      {
        key: 'projects',
        label: 'Projects',
        metric: String(projects.result.total ?? 0),
      }
    );
    return cards;
  }, [consumptionQuery.data, budget, apiKeys.result.total, projects.result.total]);

  // ── phase 4: Export — `PageHeader.action`, defaults from this screen's own params ──────────
  const reportAction = useSharedMutation<ReportExportParams, void>({
    mutationKey: REPORT_MUTATION_KEY,
    mutationFn: async (params) => {
      if (!accountId) {
        throw new Error('Select an account before generating a report.');
      }
      const query = new URLSearchParams({
        month: params.period,
        account: accountId,
        format: params.format,
      });
      if (projectId) query.set('project', projectId);

      const response = await fetch(`/api/reports/consumption?${query.toString()}`);
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body &&
          typeof body === 'object' &&
          typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : 'Could not generate the report. Try again.';
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename =
        filenameFromContentDisposition(response.headers.get('content-disposition')) ??
        `consumption-${params.period}.${params.format}`;
      downloadBlob(blob, filename);
    },
  });

  // ── phase 4, admin-only: budget pressure — the account-wide per-project draw on the SAME
  // ceiling `budget` above already reads (reused rather than a second balance query). ─────────
  const pressureQuery = useQuery({
    queryKey: ['usage', 'budget-consumption-by-project', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionByProjectRequest(accountId, new Date())),
    enabled: Boolean(accountId) && isAdmin,
    staleTime: 30_000,
  });

  const pressureProjects = useMemo<BudgetPressureProject[]>(
    () =>
      pressureQuery.data
        ? toSpendShareSegments(pressureQuery.data, 'project', labelForProject).map((segment) => ({
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

  const pressureCeiling = 'ceiling' in budget ? budget.ceiling : null;

  // ── phase 4, admin-only: key hygiene, account-wide (every project, not only the scoped one).
  const adminProjects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: PROJECTS_PAGE_SIZE },
    filters: accountId ? [{ field: 'accountId', operator: 'eq', value: accountId }] : [],
    queryOptions: { enabled: isAdmin },
  });

  const adminApiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: KEYS_PAGE_SIZE },
    queryOptions: { enabled: isAdmin },
  });

  const accountProjectIds = useMemo(
    () => new Set(adminProjects.result.data.map((project) => project.id)),
    [adminProjects.result.data]
  );

  const accountKeys = useMemo(
    () => adminApiKeys.result.data.filter((key) => accountProjectIds.has(key.projectId)),
    [adminApiKeys.result.data, accountProjectIds]
  );

  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and an
  // "expires in N days" count is relative to when the listing was read.
  const adminKeysReadAt = adminApiKeys.query.dataUpdatedAt;
  const adminKeysTotal = adminApiKeys.result.total ?? adminApiKeys.result.data.length;

  // ── phase 4, admin-only: pending refill requests — the SAME query `/admin`'s review centre
  // and the sidebar's nav count read, shared by query key (`use-refills-queue-screen.ts`'s own doc
  // comment), fired only for an admin.
  const queue = useRefillsQueueScreen(isAdmin);

  return {
    scopeAccountLabel,
    scopeProjectLabel,
    subline: `${RANGE_LABELS[view.range]} · UTC`,
    statCards,
    statCardsLoading: projects.query.isLoading || apiKeys.query.isLoading,
    // `''` is the parser default (absent from the URL); the chart sections speak `null`.
    selectedSeriesKey: view.series || null,
    setSelectedSeriesKey: (series) => {
      void setView({ series: series ?? '' }, OVERVIEW_SELECTION_OPTIONS);
    },
    rangeField: {
      label: 'Range',
      presets: RANGE_PRESETS,
      // `null` once an explicit span is in the URL — that is what makes the trigger show the
      // dates rather than a preset label that is no longer true.
      preset: view.from && view.to ? null : view.range,
      value: { from: usageWindow.start, to: usageWindow.end },
      onPresetChange: (range) => {
        // Clear the explicit span, or it would keep winning over the preset just chosen.
        void setView({ range: range as (typeof OVERVIEW_RANGES)[number], from: '', to: '' });
      },
      onRangeChange: ({ from, to }) => {
        void setView({ from: toUrlDate(from), to: toUrlDate(to) });
      },
    },
    bucketField: {
      label: 'Bucket',
      value: view.bucket,
      options: BUCKET_OPTIONS,
      onChange: (bucket) => {
        void setView({ bucket: bucket as (typeof OVERVIEW_BUCKETS)[number] });
      },
    },
    groupByField: {
      label: 'Group by',
      value: view.groupBy,
      options: GROUP_BY_OPTIONS,
      onChange: (groupBy) => {
        void setView({ groupBy: groupBy as (typeof OVERVIEW_GROUP_BYS)[number] });
      },
    },
    projectField: {
      label: 'Project',
      value: scope.value.projectId ?? '',
      options: [
        { value: '', label: 'All projects' },
        ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
      ],
      onChange: (projectId) =>
        scope.setValue({ accountId: scope.value.accountId, projectId: projectId || null }),
    },
    spendSeries,
    spendSegments,
    spendStatus,
    spendErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    spendRetry: () => void usageQuery.refetch(),
    modelSpendSegments,
    modelSpendStatus,
    modelSpendErrorMessage: modelUsageQuery.isError
      ? getUsageErrorMessage(modelUsageQuery.error)
      : undefined,
    modelSpendRetry: () => void modelUsageQuery.refetch(),
    budget,
    refillAction,
    refillErrorMessage: refillOutcome.errorMessage,
    report: {
      open: view.reportOpen,
      onOpenChange: (open) => {
        void setView({ reportOpen: open }, OVERVIEW_SELECTION_OPTIONS);
      },
      period: view.period,
      onPeriodChange: (period) => {
        void setView({ period });
      },
      scopeSlot,
      groupByOptions: GROUP_BY_OPTIONS,
      groupBy: view.reportGroupBy,
      onGroupByChange: (reportGroupBy) => {
        void setView({ reportGroupBy: reportGroupBy as (typeof OVERVIEW_GROUP_BYS)[number] });
      },
      includeToggles: REPORT_INCLUDE_IDS.map((id) => ({
        id,
        label: REPORT_INCLUDE_LABELS[id],
        checked: view.include.includes(id),
      })),
      onToggleInclude: (id, checked) => {
        const next = REPORT_INCLUDE_IDS.filter((candidate) =>
          candidate === id ? checked : view.include.includes(candidate)
        );
        void setView({ include: next });
      },
      format: view.format,
      onFormatChange: (format) => {
        void setView({ format: format as (typeof REPORT_FORMATS)[number] });
      },
      onGenerate: (params) => reportAction.mutate(params),
      generating: reportAction.isPending,
      notice: reportAction.errorMessage
        ? { message: reportAction.errorMessage, onDismiss: reportAction.dismiss }
        : undefined,
    },
    isAdmin,
    adminPressure: isAdmin
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
    adminHygiene: isAdmin
      ? {
          hygiene: apiKeysHygiene(accountKeys, adminKeysReadAt),
          summary: apiKeysStatusSummary(accountKeys, adminKeysReadAt),
          // Precise about WHAT was truncated: the key LISTING is unfiltered (an `ApiKey` carries
          // no `accountId` to filter on), so a total above one page means keys belonging to this
          // account may sit beyond it.
          caveat:
            adminKeysTotal > adminApiKeys.result.data.length
              ? `Counted over the first ${adminApiKeys.result.data.length} of ${adminKeysTotal} keys the listing returned — any of this account’s keys beyond that page are not included.`
              : undefined,
        }
      : undefined,
    // Omitted entirely when there is nothing pending — mirrors `BudgetPanel`'s own contract.
    refillRequestStatus:
      queue.pendingCount > 0
        ? {
            pendingCount: queue.pendingCount,
            submittedLabel: queue.pending[0]
              ? `oldest submitted ${queue.pending[0].submittedAgo}`
              : 'awaiting a decision',
          }
        : undefined,
  };
}
