'use client';

import { createId } from '@lightbridge/authz-rpc';
import type { ApiKey, AugmentationRequest, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  BudgetSummary,
  DashboardStatus,
  LatencyRidgelineSeries,
  ShareBarSegment,
  OverviewStatCardData,
  DateRangeFieldProps,
  DateRangePreset,
  SelectFieldProps,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useSharedMutation } from '../client/use-shared-mutation';
import { useConsoleScope } from '../client/use-console-scope';
import {
  OVERVIEW_BUCKETS,
  OVERVIEW_GROUP_BYS,
  OVERVIEW_RANGES,
  OVERVIEW_SELECTION_OPTIONS,
  useOverviewParams,
} from '../client/url-state';
import { microsToAmount } from './refill-rows';
import type { LatencyAdaptation } from './overview-usage';
import {
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  sumTotalCost,
  toLatencySeries,
  toSpendSeries,
  resolveOverviewWindow,
  UNASSIGNED_KEY,
  toSpendShareSegments,
  toUrlDate,
  type SeriesLabeller,
  RANGE_DAYS,
} from './overview-usage';

/**
 * `/` — the Overview dashboard's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/page.tsx`).
 *
 * The two callers issue the same `useList`/`useQuery` query keys, so TanStack Query serves both
 * from one request; the view state they both read is the **query string** (ADR 0011) —
 * `?range=7d&series=…` — so the rail's RANGE select and the centre's chart cannot drift apart, and
 * the dashboard a user has configured is a link they can send.
 *
 * What is real here, as of #304-#306 and this story: project/API-key counts (refine over the
 * generated resources), SPEND/SPEND SHARE (`queryUsage` -> `overview-usage.ts`'s adapters),
 * BudgetHero's consumption-vs-ceiling (the SAME `queryUsage` summed for the current billing
 * period, paired with `getMyBudgetBalance`'s `effectiveBudgetMicros` for the ceiling), and now
 * LATENCY, off the exact same `usageQuery` SPEND already runs — no third request.
 *
 * LATENCY is honest PER SERIES rather than all-or-nothing: the lightbridge-authz usage API now
 * returns `latency_samples`/`latency_p50_ms`/`latency_p95_ms`/`latency_p99_ms` per bucket (ADR
 * 0008 Decision 7's amended status note), but an individual group within a response can still
 * legitimately report zero samples — an aggregate metric signal (an OTLP histogram/summary data
 * point) never carries a per-request duration, so the backend deliberately records no latency for
 * it rather than fabricating a mean. `toLatencySeries` (`overview-usage.ts`) keeps that group in
 * the ridgeline (so the reader can see the model exists) while naming the gap in
 * `latencyFootnote` rather than either fabricating a shape for it or blanking the whole panel.
 * `latencyStatus` stays `'ready'` even when EVERY group reported nothing this range — the query
 * itself succeeded; an empty ridgeline plus the footnote is the honest rendering, not
 * `'unwired'` (that vocabulary means "never queried," which is no longer true for anything on
 * this screen).
 */

/**
 * The Overview EXPORT rail control's disabled-reason caption (console-ui#324) — the CSV export
 * route doesn't exist yet (tracked separately as `#308`, Epic 4). Shared by `OverviewRail` and
 * `OverviewCentre` so the persistent rail and the compact-tier sheet can never drift onto
 * different wording for the same control.
 */
export const OVERVIEW_EXPORT_UNAVAILABLE_CAPTION = "Export isn't available yet.";

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

// The option lists are derived from the URL contract's own literal unions rather than declared
// beside it: a value the rail can offer but the parser would reject is exactly the drift ADR 0011
// makes the contract module responsible for preventing.
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

const MODEL_OPTIONS = [{ value: 'all', label: 'All models' }];

/** Matches `Meter`'s own default (`packages/ui-web/src/components/meter/component.tsx`) — the
 *  account-level refill control only appears once the SAME ratio that turns the meter `--signal`
 *  is crossed, so the control and the visual breach cue always agree. */
const BUDGET_BREACH_THRESHOLD = 0.9;

/** Module-level so both zones (centre/rail, if the control is ever echoed there) agree on the
 *  shared-mutation identity — same pattern as `use-admin-screen.ts`'s `DECIDE_MUTATION_KEY`. */
const OVERVIEW_REFILL_MUTATION_KEY = ['budget', 'requestRefill', 'overview'] as const;

/**
 * The LATENCY footnote's per-series honesty logic (`toLatencySeries`'s `LatencyAdaptation`):
 *
 * - No response yet, or an empty response (no groups at all) — `undefined`. Nothing to caveat;
 *   the empty ridgeline already says "no data" on its own terms, the same as SPEND's empty chart.
 * - Every group reported real latency — `undefined`. Nothing to caveat.
 * - Every group reported zero samples — names the range/filter itself as the reason, not a list
 *   of models (there is nothing to list that would add information).
 * - Some, but not all, groups reported zero samples — names exactly those groups, so the reader
 *   can tell a genuine gap (an aggregate-metric-only model) from "the whole panel is broken."
 *
 * Exported because the admin overview (`use-admin-overview-screen.ts`) renders the same
 * `LatencyDashboard` off the same `toLatencySeries` adaptation. The honesty contract is a property
 * of the DATA, not of which screen is displaying it — a second copy of this logic is exactly how
 * one screen ends up quietly less honest than the other.
 */
export function buildLatencyFootnote(
  adaptation: LatencyAdaptation | undefined
): string | undefined {
  if (!adaptation) return undefined;
  const { series, seriesWithoutLatency } = adaptation;
  if (series.length === 0 || seriesWithoutLatency.length === 0) return undefined;

  if (seriesWithoutLatency.length === series.length) {
    return (
      'No latency reported for this range or filter — every event was either an aggregate ' +
      'metric signal or otherwise carried no per-request duration.'
    );
  }

  return (
    `No latency reported for ${seriesWithoutLatency.join(', ')} — aggregate metric signals ` +
    'carry a bucketed distribution, not a per-request duration.'
  );
}

/** Ascending-sorts `allowedAmountsMicros` (decimal strings — `BigInt`, never `Number`, since a
 *  micros amount can exceed `Number.MAX_SAFE_INTEGER`) and returns the smallest. `null` when the
 *  policy currently offers nothing. */
function smallestAllowedAmountMicros(amountsMicros: string[]): string | null {
  if (amountsMicros.length === 0) return null;
  return [...amountsMicros].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1))[0];
}

export interface OverviewScreen {
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
  modelField: Omit<SelectFieldProps, 'layout'>;
  // ── #305: SPEND / SPEND SHARE ────────────────────────────────────────────────────────────
  spendSeries: SpendSeriesSeries[];
  spendSegments: ShareBarSegment[];
  spendStatus: DashboardStatus;
  spendErrorMessage?: string;
  spendRetry: () => void;
  // ── LATENCY — wired off the same usageQuery as SPEND, honest per series ─────────────────
  latencySeries: LatencyRidgelineSeries[];
  latencyStatus: DashboardStatus;
  latencyErrorMessage?: string;
  latencyRetry: () => void;
  /** Names which group(s) reported zero latency samples across the whole range, or that NONE
   *  did — `undefined` when every group reported real latency (nothing to caveat). See
   *  `toLatencySeries` (`overview-usage.ts`) for the per-series honesty contract this derives
   *  from. */
  latencyFootnote?: string;
  // ── #306: BudgetHero consumption vs ceiling + the inline refill control ─────────────────
  budget: BudgetSummary;
  /** Only defined once the account itself is breached (`BUDGET_BREACH_THRESHOLD`) AND the active
   *  policy currently offers an amount — `BudgetHero.action`'s own "only present once breached"
   *  convention (see `budget-hero/types.ts`). */
  refillAction: { label: string; onClick: () => void; pending: boolean } | undefined;
  refillErrorMessage: string | undefined;
}

export function useOverviewScreen(): OverviewScreen {
  const scope = useConsoleScope();
  const [view, setView] = useOverviewParams();
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();

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

  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.projectId
      ? [{ field: 'projectId', operator: 'eq', value: scope.value.projectId }]
      : [],
  });

  const statCards = useMemo<OverviewStatCardData[]>(
    () => [
      {
        key: 'projects',
        icon: 'projects',
        label: 'Projects',
        metric: String(projects.result.total ?? 0),
        // No `sparklineData` — there is no trend series behind a project/key COUNT (as opposed
        // to spend, which now has one — see `spendSeries` below), and `OverviewStatRow` renders
        // no sparkline slot at all when it's omitted, rather than an empty/flat decorative line.
      },
      {
        key: 'keys',
        icon: 'keys',
        label: 'API keys',
        metric: String(apiKeys.result.total ?? 0),
        // No `sparklineData` — see the `projects` card above.
      },
    ],
    [projects.result.total, apiKeys.result.total]
  );

  const scopeProjectLabel =
    scope.projects.find((project) => project.id === scope.value.projectId)?.label ?? 'All projects';

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
  const labelForSeries = useMemo<SeriesLabeller>(() => {
    if (view.groupBy !== 'project') return (key) => key;
    const namesById = new Map(scope.allProjects.map((project) => [project.id, project.name]));
    return (key) => {
      if (key === UNASSIGNED_KEY) return 'Unassigned';
      return namesById.get(key) || key;
    };
  }, [view.groupBy, scope.allProjects]);

  const spendSeries = useMemo(
    () => (usageQuery.data ? toSpendSeries(usageQuery.data, view.groupBy, labelForSeries) : []),
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const spendSegments = useMemo(
    () =>
      usageQuery.data ? toSpendShareSegments(usageQuery.data, view.groupBy, labelForSeries) : [],
    [usageQuery.data, view.groupBy, labelForSeries]
  );

  // ── LATENCY — the SAME usageQuery SPEND already runs, never a third request. `latencyStatus`
  // mirrors `spendStatus` exactly: a failed/pending usage query takes both charts down together
  // (they are the same query), never one looking wired while the other doesn't.
  const latencyStatus: DashboardStatus = spendStatus;
  const latencyAdaptation = useMemo(
    () =>
      usageQuery.data ? toLatencySeries(usageQuery.data, view.groupBy, labelForSeries) : undefined,
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  const latencySeries = latencyAdaptation?.series ?? [];
  const latencyFootnote = useMemo(
    () => buildLatencyFootnote(latencyAdaptation),
    [latencyAdaptation]
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

  const ladderQuery = useQuery({
    queryKey: ['budget', 'myRefillLadder', period],
    queryFn: () => budgetClient.procedures.getMyBudgetRefillLadder({ args: { period } }),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const refill = useSharedMutation<string, AugmentationRequest>({
    mutationKey: OVERVIEW_REFILL_MUTATION_KEY,
    mutationFn: (requestedAmountMicros) =>
      budgetClient.procedures.requestBudgetRefill({
        args: {
          accountId,
          // One account is one budget account (`authz.cstack`'s own `GetMyBudgetBalanceInput`
          // doc comment: "budget_account_id is always identical to account_id") — no separate
          // "list my budget accounts" RPC exists, matching `@lightbridge/hooks/budget.ts`'s own
          // `RequestBudgetRefillArgs.budgetAccountId` convention.
          budgetAccountId: accountId,
          period,
          idempotencyKey: createId(),
          requestedAmountMicros,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget', 'myBalance', accountId, period] });
      void queryClient.invalidateQueries({ queryKey: ['budget', 'myRefillLadder', period] });
    },
  });

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
    ? smallestAllowedAmountMicros(ladderQuery.data?.allowedAmountsMicros ?? [])
    : null;

  let refillAction: OverviewScreen['refillAction'];
  if (smallestAmountMicros) {
    const amountMicros = smallestAmountMicros;
    refillAction = {
      label: `Request refill (+${formatMicros(amountMicros)})`,
      onClick: () => refill.mutate(amountMicros),
      pending: refill.isPending,
    };
  }

  return {
    scopeProjectLabel,
    // No account id here: the header's `AccountBadge` is the console's one rendering of which
    // account you are in. This was copy two of four.
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
    modelField: {
      label: 'Model',
      value: view.model,
      options: MODEL_OPTIONS,
      onChange: (model) => {
        void setView({ model });
      },
    },
    spendSeries,
    spendSegments,
    spendStatus,
    spendErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    spendRetry: () => void usageQuery.refetch(),
    latencySeries,
    latencyStatus,
    latencyErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    latencyRetry: () => void usageQuery.refetch(),
    latencyFootnote,
    budget,
    refillAction,
    refillErrorMessage: refill.errorMessage,
  };
}

/**
 * The refill CTA's amount, e.g. `Request refill (+$12.00)`.
 *
 * `microsToAmount` handles the unit (budget-domain integer micros arriving as a decimal string —
 * see its own docstring for why a string); `formatUsd` handles the rendering. This used to call
 * `amount.toLocaleString('en-US')` directly, which is a SECOND currency convention: it groups
 * thousands with a comma (`$1,200`) where the whole console groups with a thin space
 * (`$1 200.00`), and it drops the cents the rest of the console always writes. One convention,
 * one function.
 */
function formatMicros(amountMicros: string): string {
  return formatUsd(microsToAmount(amountMicros));
}
