'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
// `BudgetPressure` is imported from its own subpath rather than the package barrel: the barrel
// (`packages/ui-web/src/index.ts`) is being edited by parallel work, so this section stays on the
// `"./src/*"` subpath export until its barrel lines land. See the PR body for the two lines needed.
import type {
  BudgetPressureProject,
  BudgetPressureStatus,
} from '@lightbridge/ui-web/src/sections/budget-pressure';
import type {
  ApiKeysHygiene,
  BudgetSummary,
  DashboardStatus,
  DateRangeFieldProps,
  DateRangePreset,
  LatencyRidgelineSeries,
  OverviewStatCardData,
  SelectFieldProps,
  ShareBarSegment,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { formatUsd } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import {
  ADMIN_OVERVIEW_SELECTION_OPTIONS,
  OVERVIEW_BUCKETS,
  OVERVIEW_GROUP_BYS,
  OVERVIEW_RANGES,
  useAdminOverviewParams,
} from '../client/url-state';
import { apiKeysHygiene, apiKeysStatusSummary } from './api-key-rows';
import {
  RANGE_DAYS,
  UNASSIGNED_KEY,
  buildBudgetConsumptionByProjectRequest,
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  resolveOverviewWindow,
  sumTotalCost,
  toLatencySeries,
  toSpendSeries,
  toSpendShareSegments,
  toUrlDate,
  type SeriesLabeller,
} from './overview-usage';
import { microsToAmount } from './refill-rows';
import { useAdminScreen } from './use-admin-screen';
import { buildLatencyFootnote } from './use-overview-screen';

/**
 * `/admin?section=overview` — the OPERATOR's dashboard, shared by its centre
 * (`admin-overview-centre.tsx`) and the left rail's view controls (`admin-sub-nav.tsx`).
 *
 * **How this differs from `/`, which is the thing that justifies it existing.** Overview is a
 * dashboard PER USER (owner, 2026-08-29): what I spend, what I have left, which keys I hold, and
 * latency is deliberately absent there because per-bucket p95 by model answers a question nobody
 * reading their own spend is asking. This screen is the other half — what the operator needs
 * across the WHOLE account:
 *
 *  - It is **always account-scoped**. `useConsoleScope().value.projectId` is not consulted at all:
 *    a project filter here would offer a narrowing the screen exists to refuse. Every usage query
 *    below passes `projectId: null`.
 *  - It **keeps latency**, off the same `usageQuery` the spend charts run — no third request —
 *    including the per-series `latencyFootnote` that names which groups reported no samples. That
 *    honesty contract (`toLatencySeries` -> `buildLatencyFootnote`) is imported, never re-derived.
 *  - It adds the two things only an operator asks for: which projects are drawing hardest on the
 *    account ceiling, and key hygiene across every project rather than the scoped one.
 *
 * **Access is gated server-side** in `app/(console)/admin/page.tsx` and its two slot segments,
 * each of which `notFound()`s a non-admin before any of this markup is generated. The nav gating
 * and this hook are presentation only; `lightbridge-authz` refuses the budget procedures without
 * the right grant regardless.
 */

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const BUCKET_LABELS: Record<(typeof OVERVIEW_BUCKETS)[number], string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
};

const GROUP_BY_LABELS: Record<(typeof OVERVIEW_GROUP_BYS)[number], string> = {
  project: 'Project',
  model: 'Model',
};

// Derived from the URL contract's own literal unions, exactly as `use-overview-screen.ts` does:
// an option the rail can offer but the parser would reject is the drift ADR 0011 makes the
// contract module responsible for preventing.
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

/** Matches `Meter`'s own default, so the control and the visual breach cue always agree — same
 *  constant `use-overview-screen.ts` pins for the same reason. */
const BUDGET_BREACH_THRESHOLD = 0.9;

/**
 * How many API keys the hygiene block reads in one page.
 *
 * `listApiKeys` is paged and this screen wants an ACCOUNT-wide count, which the resource cannot
 * express as a filter (`ApiKey` carries `projectId`, never `accountId` — `authz.cstack:355-379`),
 * so the keys are fetched and matched against the account's own project ids here. When the account
 * genuinely holds more keys than one page, `hygieneCaveat` says so rather than letting a partial
 * count read as a complete one.
 */
const KEYS_PAGE_SIZE = 100;
const PROJECTS_PAGE_SIZE = 100;

/**
 * The budget-pressure zone's scope caveat, stated in the UI rather than only in a code comment.
 *
 * There is **no per-project budget ceiling anywhere in the authz schema**: `Project.projectQuota`
 * is a governance TIER id drawn from an operator-configured catalogue (`authz.cstack:918-936`, and
 * `project-rows.ts`'s own note — it is never `Number()`-ed), and the only balance procedures,
 * `getMyBudgetBalance`/`getBudgetBalance`, are keyed by `budgetAccountId`, which "is always
 * identical to account_id". So "which projects are nearest their ceiling" cannot be answered as
 * asked. What IS real is each project's draw on the account's single ceiling, which is what the
 * meters show and what this line says out loud.
 */
export const BUDGET_PRESSURE_SCOPE_NOTE =
  'Each bar is the project’s draw on the account’s single ceiling for this billing period. ' +
  'Projects have no ceiling of their own — a project’s quota is a governance tier, not a ' +
  'currency amount — so this ranks pressure, it does not report per-project headroom.';

export interface AdminOverviewScreen {
  subline: string;
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  // ── view controls (left rail) ───────────────────────────────────────────────────────────────
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  bucketField: Omit<SelectFieldProps, 'layout'>;
  groupByField: Omit<SelectFieldProps, 'layout'>;
  selectedSeriesKey: string | null;
  setSelectedSeriesKey: (key: string | null) => void;
  // ── spend, every project ────────────────────────────────────────────────────────────────────
  /** Follows `groupBy` — a heading that says "by project" over model-grouped series is a small
   *  lie, and this screen's whole argument is that it does not tell those. */
  spendLabel: string;
  spendShareLabel: string;
  spendSeries: SpendSeriesSeries[];
  spendSegments: ShareBarSegment[];
  spendTotal: string | undefined;
  spendStatus: DashboardStatus;
  spendErrorMessage?: string;
  spendRetry: () => void;
  // ── latency — the operator's metric, off the same query ─────────────────────────────────────
  latencySeries: LatencyRidgelineSeries[];
  latencyStatus: DashboardStatus;
  latencyErrorMessage?: string;
  latencyRetry: () => void;
  latencyFootnote?: string;
  // ── budget ──────────────────────────────────────────────────────────────────────────────────
  budget: BudgetSummary;
  refillRequestStatus: { pendingCount: number; submittedLabel: string } | undefined;
  pressure: {
    projects: BudgetPressureProject[];
    /** `null` when no ceiling could be read — `BudgetPressure` then drops its meters entirely. */
    ceiling: number | null;
    status: BudgetPressureStatus;
    errorMessage?: string;
    onRetry: () => void;
    note: string;
  };
  // ── key hygiene, account-wide ───────────────────────────────────────────────────────────────
  hygiene: ApiKeysHygiene;
  hygieneSummary: string;
  /** Set only when the key listing was truncated — never left implicit. */
  hygieneCaveat?: string;
}

export function useAdminOverviewScreen(): AdminOverviewScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const budgetClient = useConsoleBudgetClient();
  const [view, setView] = useAdminOverviewParams();
  // The refill queue, shared by query key with the review section and its sub-nav count: one
  // fetch regardless of how many zones read it.
  const queue = useAdminScreen();

  const accountId = scope.value.accountId;

  // One resolution, read by both the query and the picker's displayed value — so the calendar can
  // never show a span different from the one that was actually fetched.
  const usageWindow = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );

  const projects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: PROJECTS_PAGE_SIZE },
    filters: accountId ? [{ field: 'accountId', operator: 'eq', value: accountId }] : [],
  });

  // No project filter: the point of this screen is every key in the account. See KEYS_PAGE_SIZE.
  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: KEYS_PAGE_SIZE },
  });

  const accountProjectIds = useMemo(
    () => new Set(projects.result.data.map((project) => project.id)),
    [projects.result.data]
  );

  const accountKeys = useMemo(
    () => apiKeys.result.data.filter((key) => accountProjectIds.has(key.projectId)),
    [apiKeys.result.data, accountProjectIds]
  );

  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and an
  // "expires in N days" count is relative to when the listing was read.
  const keysReadAt = apiKeys.query.dataUpdatedAt;

  // ── spend + latency, one account-wide usage query ──────────────────────────────────────────
  const usageQuery = useQuery({
    queryKey: [
      'usage',
      'admin-overview',
      accountId,
      view.range,
      view.bucket,
      view.groupBy,
      view.from,
      view.to,
    ],
    queryFn: () =>
      queryUsage(
        buildOverviewUsageRequest({
          accountId,
          // Account-wide, always — see this module's doc comment.
          projectId: null,
          window: usageWindow,
          bucket: view.bucket,
          groupBy: view.groupBy,
          model: 'all',
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

  // Project ids resolve to project NAMES before anything renders them — the same labeller the
  // Overview screen uses, for the same reason (owner, 2026-08-29: `zezxvt21irmoi0kzm22el7gu` is
  // not a chart legend). `key` stays the id: it is the selection identity.
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

  const spendSeries = useMemo(
    () => (usageQuery.data ? toSpendSeries(usageQuery.data, view.groupBy, labelForSeries) : []),
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const spendSegments = useMemo(
    () =>
      usageQuery.data ? toSpendShareSegments(usageQuery.data, view.groupBy, labelForSeries) : [],
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const spendTotalValue = spendSegments.reduce((sum, segment) => sum + segment.value, 0);

  const latencyAdaptation = useMemo(
    () =>
      usageQuery.data ? toLatencySeries(usageQuery.data, view.groupBy, labelForSeries) : undefined,
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const latencyFootnote = useMemo(
    () => buildLatencyFootnote(latencyAdaptation),
    [latencyAdaptation]
  );

  // ── budget: the account ceiling, and the per-project draw on it ─────────────────────────────
  // Resolved once per mount, not per render — same "moving default, resolved once" pattern
  // `use-overview-screen.ts` and `url-state.ts`'s `CURRENT_PERIOD` both use.
  const period = useMemo(() => currentBudgetPeriod(), []);

  const consumptionQuery = useQuery({
    queryKey: ['usage', 'budget-consumption', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const pressureQuery = useQuery({
    queryKey: ['usage', 'budget-consumption-by-project', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionByProjectRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  /**
   * The lowest-privilege procedure that can answer for the account actually in scope.
   *
   * `accounts.id` IS the JWT subject (ADR-0006), so when the scoped account is the signed-in
   * principal's own, `getMyBudgetBalance` (`budget:read-own`) is both correct and the narrower
   * grant — it is what `/` already calls successfully. Only when an operator is looking at a
   * DIFFERENT account does this need `getBudgetBalance`, the admin equivalent gated at the much
   * stronger `budget:read`. Reaching for the stronger one unconditionally would make the whole
   * budget zone fail for every admin who happens to be looking at their own account without that
   * grant, which is the common case.
   */
  const ownAccount = Boolean(accountId) && session.user?.sub === accountId;
  const balanceQuery = useQuery({
    queryKey: ['budget', ownAccount ? 'myBalance' : 'balance', accountId, period],
    queryFn: () =>
      ownAccount
        ? budgetClient.procedures.getMyBudgetBalance({ args: { period } })
        : budgetClient.procedures.getBudgetBalance({
            args: { budgetAccountId: accountId, period },
          }),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const ceiling =
    balanceQuery.data === undefined
      ? null
      : microsToAmount(balanceQuery.data.effectiveBudgetMicros);

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
    const accountCeiling = microsToAmount(balanceQuery.data.effectiveBudgetMicros);
    const percent = accountCeiling > 0 ? Math.round((value / accountCeiling) * 100) : 0;
    return {
      value,
      ceiling: accountCeiling,
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
  ]);

  // Reuses `toSpendShareSegments` verbatim rather than re-summing: it already groups by the same
  // dimension, formats with the same money ladder, and sorts largest-first — which is the exact
  // rank the pressure list is about.
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

  const pressureStatus: BudgetPressureStatus =
    pressureQuery.isError || balanceQuery.isError
      ? 'error'
      : pressureQuery.isPending || balanceQuery.isPending
        ? 'loading'
        : 'ready';

  const statCards = useMemo<OverviewStatCardData[]>(
    () => [
      {
        key: 'projects',
        icon: 'projects',
        label: 'Projects',
        metric: String(projects.result.total ?? 0),
      },
      {
        key: 'keys',
        icon: 'keys',
        label: 'API keys',
        metric: String(accountKeys.length),
      },
      {
        key: 'requests',
        icon: 'requests',
        label: 'Refills awaiting review',
        metric: String(queue.pendingCount),
      },
      {
        key: 'spend',
        icon: 'spend',
        label: 'Spend this period',
        // The period total, not the range total: it is the number the ceiling is judged against.
        // An honest em dash while the query is unresolved, never a placeholder `$0.00`.
        metric: consumptionQuery.data ? formatUsd(sumTotalCost(consumptionQuery.data)) : '—',
      },
    ],
    [projects.result.total, accountKeys.length, queue.pendingCount, consumptionQuery.data]
  );

  const keysTotal = apiKeys.result.total ?? apiKeys.result.data.length;

  return {
    // No account id: the header's `AccountBadge` is the console's one rendering of which account
    // you are in. What this subline adds is the two facts that make the numbers readable.
    subline: `${RANGE_LABELS[view.range]} · every project in this account · UTC`,
    statCards,
    statCardsLoading: projects.query.isLoading || apiKeys.query.isLoading,
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
    // `''` is the parser default (absent from the URL); the chart sections speak `null`.
    selectedSeriesKey: view.series || null,
    setSelectedSeriesKey: (series) => {
      void setView({ series: series ?? '' }, ADMIN_OVERVIEW_SELECTION_OPTIONS);
    },
    spendLabel:
      view.groupBy === 'project'
        ? 'Spend — every project in this account'
        : 'Spend — by model, every project in this account',
    spendShareLabel:
      view.groupBy === 'project' ? 'Spend — share by project' : 'Spend — share by model',
    spendSeries,
    spendSegments,
    spendTotal: spendTotalValue > 0 ? formatUsd(spendTotalValue) : undefined,
    spendStatus,
    spendErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    spendRetry: () => void usageQuery.refetch(),
    latencySeries: latencyAdaptation?.series ?? [],
    // Mirrors `spendStatus` exactly: they are the same query, so they can never disagree about
    // whether the data arrived.
    latencyStatus: spendStatus,
    latencyErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    latencyRetry: () => void usageQuery.refetch(),
    latencyFootnote,
    budget,
    // Omitted entirely when there is nothing pending — `BudgetPanel` renders no empty placeholder.
    refillRequestStatus:
      queue.pendingCount > 0
        ? {
            pendingCount: queue.pendingCount,
            submittedLabel: queue.pending[0]
              ? `oldest submitted ${queue.pending[0].submittedAgo}`
              : 'awaiting a decision',
          }
        : undefined,
    pressure: {
      projects: pressureProjects,
      ceiling,
      status: pressureStatus,
      errorMessage: pressureQuery.isError
        ? getUsageErrorMessage(pressureQuery.error)
        : balanceQuery.isError
          ? 'Failed to load the account budget ceiling.'
          : undefined,
      onRetry: () => {
        void pressureQuery.refetch();
        void balanceQuery.refetch();
      },
      note: BUDGET_PRESSURE_SCOPE_NOTE,
    },
    hygiene: apiKeysHygiene(accountKeys, keysReadAt),
    hygieneSummary: apiKeysStatusSummary(accountKeys, keysReadAt),
    // Precise about WHAT was truncated: the key LISTING is unfiltered (an `ApiKey` carries no
    // `accountId` to filter on), so a total above one page means keys belonging to this account
    // may sit beyond it. Saying "this account holds more than one page" would be a stronger claim
    // than the data supports — the overflow could be entirely another account's.
    hygieneCaveat:
      keysTotal > apiKeys.result.data.length
        ? `Counted over the first ${apiKeys.result.data.length} of ${keysTotal} keys the listing returned — any of this account’s keys beyond that page are not included.`
        : undefined,
  };
}
