'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  BudgetSummary,
  DashboardStatus,
  ShareBarSegment,
  OverviewStatCardData,
  DateRangeFieldProps,
  DateRangePreset,
  RankedSeriesRow,
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
import { isHomeAccount } from './account-ownership';
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
import { downloadBlob, filenameFromContentDisposition } from './download-file';
import { microsToAmount, refillHref } from './refill-rows';
import {
  BUDGET_HOME_ACCOUNT_ONLY_NOTE,
  smallestAllowedAmountMicros,
  useBudgetRefillLadder,
} from './use-budget-refill';
import {
  activeApiKeysCountFilters,
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  capSeriesWithOther,
  degenerateChartMessage,
  sumTotalCost,
  toSpendSeries,
  resolveOverviewWindow,
  splitUnassignedProjects,
  UNASSIGNED_KEY,
  toSpendShareSegments,
  toUrlDate,
  type SeriesLabeller,
  RANGE_DAYS,
} from './overview-usage';
import { toRankedSeriesRows } from './settings-overview-usage';

/**
 * `/` — the account-scoped user dashboard (IA v3 phase 4, build brief §7: "`/` becomes purely the
 * account-scoped user dashboard — that is the point of the phase"). The centre (`overview-
 * centre.tsx`) is the ONLY caller.
 *
 * **No admin-only zone lives here any more.** BUDGET PRESSURE and KEY HYGIENE — the two cards this
 * hook used to compute directly, gated `enabled: … && isAdmin` — MOVED to
 * `use-settings-overview-screen.ts`, onto the project lens and the account lens respectively
 * (`/settings/overview/project`, `/settings/overview/account`); the pending-refill count
 * (`refillRequestStatus`) is gone outright, not moved — it already lives in the settings nav's own
 * numeral (`use-refills-queue-screen.ts`, shared by query key with `/settings/refills-queue`).
 * This hook fires no `enabled: isAdmin` query of any kind: every query below runs the same way for
 * every signed-in user, admin or not.
 *
 * **What is real here.** Project/API-key counts, SPEND/SPEND SHARE/SPEND BY MODEL, BudgetHero
 * consumption-vs-ceiling, the refill control, and Export.
 *
 * **LATENCY is gone (phase 9.2, 2026-08-30 owner directive).** The usage backend's events are
 * aggregate metric signals with no per-request duration — `toLatencySeries`'s own per-series
 * honesty logic (deleted with it) existed only because that panel could never genuinely fill.
 * SPEND BY MODEL (`modelSpendRows`) replaces it: a real breakdown the backend can actually
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
  project_id: 'By project',
  model: 'By model',
  // Widened alongside `OVERVIEW_GROUP_BYS` (console-ui#312 vocabulary fix) — the toggle now
  // offers every dimension the usage backend's own `group_by` accepts for this console's
  // purposes, not just the original two.
  user_id: 'By user',
  api_key_id: 'By API key',
};

/** The bare noun for a dimension, used in `spendDegenerateMessage` ("Only one project in this
 *  window"), never the toggle's own "By …" phrasing. */
const DIMENSION_NOUN: Record<(typeof OVERVIEW_GROUP_BYS)[number], string> = {
  project_id: 'project',
  model: 'model',
  user_id: 'user',
  api_key_id: 'API key',
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
/** `hour` is only offered when the resolved window is <=2 days (build brief §5): an hourly bucket
 *  over a 90-day range would ask the usage backend for ~2,160 buckets, far past anything a chart
 *  this wide can render legibly. `day`/`week` have no such gate. */
const HOUR_BUCKET_MAX_DAYS = 2;

function bucketOptions(windowSpanDays: number) {
  return OVERVIEW_BUCKETS.filter((value) => value !== 'hour' || windowSpanDays <= HOUR_BUCKET_MAX_DAYS).map(
    (value) => ({ value, label: BUCKET_LABELS[value] })
  );
}
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
  /** Set only when the current breakdown is BY PROJECT and some spend genuinely had none — the
   *  excluded share, stated in words (build brief §7: "drop unassigned from any project
   *  breakdown, caption instead"). `undefined` for every other `groupBy`, and for a project
   *  breakdown with nothing unassigned to report. */
  spendUnassignedCaption: string | undefined;
  /**
   * Set once `spendStatus === 'ready'` when the CURRENT dimension's response resolves to <=1
   * distinct series — a single-band chart asserts a shape ("here is how this varies") the data
   * does not have. Passed straight through to `SpendDashboard.degenerateMessage`, which renders
   * an inline status line in the chart's own place. `undefined` for 0 series (the chart's own
   * built-in "No usage in this range." empty state already covers that honestly) and for >=2.
   */
  spendDegenerateMessage: string | undefined;
  spendStatus: DashboardStatus;
  spendErrorMessage?: string;
  spendRetry: () => void;
  // ── phase 9.2: SPEND BY MODEL — a second aggregate view of the SAME scope/period as SPEND
  // above (never a separately-scoped query, so the two cards can never disagree), grouped by
  // model rather than whatever the toolbar's own `groupByField` currently holds. Replaces the
  // deleted LATENCY panel (see this module's own doc comment). Renders through
  // `RankedSeriesRows` now (build brief §7 — replaces the `ShareBar`-based `SpendShareSection`
  // this card used to render through), so it carries rows, not segments. ────────────────────
  modelSpendRows: RankedSeriesRow[];
  modelSpendStatus: DashboardStatus;
  modelSpendErrorMessage?: string;
  modelSpendRetry: () => void;
  // ── #306: BudgetHero consumption vs ceiling + the inline refill control ─────────────────
  budget: BudgetSummary;
  /** `/accounts/<id>/refill` (IA v3 phase 3), carrying `?project=` when a project is scoped —
   *  the Budget card's standing "Request refill…" action always navigates here. */
  refillHref: string;
  /** Only defined once the account itself is breached (`BUDGET_BREACH_THRESHOLD`) AND the active
   *  policy currently offers an amount — `BudgetHero.action`'s own "only present once breached"
   *  convention (see `budget-hero/types.ts`). Navigates to the SAME `refillHref` rather than
   *  opening a dialog — the actual submit happens on that page. */
  refillAction: { label: string; href: string } | undefined;
  // ── phase 4: `Export` — `PageHeader.action`, defaults from this screen's own params ──────
  report: ReportExportDialogProps;
}

export function useOverviewScreen(scopeSlot: ReactNode): OverviewScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const [view, setView] = useOverviewParams();
  const budgetClient = useConsoleBudgetClient();

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

  // The account's own project ids — `scope.projects` is already scoped to `scope.value.accountId`
  // (`use-console-scope.ts`'s Phase 2d fix).
  const accountProjectIds = useMemo(
    () => scope.projects.map((project) => project.id),
    [scope.projects]
  );

  // See `activeApiKeysCountFilters`'s own doc comment (live findings #5, 2026-08-30; scoped to the
  // account by Phase 2d) — this used to be an unfiltered count, including revoked keys AND keys
  // belonging to other accounts the identity can see.
  const apiKeysCountFilters = activeApiKeysCountFilters(scope.value.projectId, accountProjectIds);
  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: apiKeysCountFilters ?? [],
    // `null` means there is no safe filter to send yet (project ids not loaded, or the account has
    // none) — never fire this unfiltered; see `apiKeysAccountFilters`'s own doc comment.
    queryOptions: { enabled: apiKeysCountFilters !== null },
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
    () => (view.groupBy === 'project_id' ? labelForProject : (key) => key),
    [view.groupBy, labelForProject]
  );

  // Model keys are already human-readable, so no id->name lookup is needed the way
  // `labelForProject` needs one — only the `UNASSIGNED_KEY` sentinel gets a friendlier label.
  const labelForModel = useMemo<SeriesLabeller>(
    () => (key) => (key === UNASSIGNED_KEY ? 'Unassigned' : key),
    []
  );

  // Capped to 4 real series + one summed "Other" at the CONSUMER (build brief §2c) — the chart
  // itself draws whatever it is given; a series explosion (a project breakdown with 30 projects)
  // is this container's problem to bound, not the chart's. The chart's own unassigned LINE is
  // dropped for a project breakdown too, same rule as the share segments below.
  const spendSeries = useMemo(() => {
    if (!usageQuery.data) return [];
    const raw = toSpendSeries(usageQuery.data, view.groupBy, labelForSeries);
    const kept = view.groupBy === 'project_id' ? raw.filter((s) => s.key !== UNASSIGNED_KEY) : raw;
    return capSeriesWithOther(kept);
  }, [usageQuery.data, view.groupBy, labelForSeries]);
  const rawSpendSegments = useMemo(
    () =>
      usageQuery.data ? toSpendShareSegments(usageQuery.data, view.groupBy, labelForSeries) : [],
    [usageQuery.data, view.groupBy, labelForSeries]
  );
  // NULL group keys are never a series in a PROJECT breakdown (build brief §7/§3) — dropped in
  // favour of a caption stating the excluded share. Every other dimension keeps its own
  // "Unassigned" segment (a null model/user/api-key is still a real, nameable bucket there).
  const { segments: spendSegments, unassignedCaption: spendUnassignedCaption } = useMemo(
    () =>
      view.groupBy === 'project_id'
        ? splitUnassignedProjects(rawSpendSegments)
        : { segments: rawSpendSegments, unassignedCaption: null },
    [view.groupBy, rawSpendSegments]
  );

  // <=1 distinct series in the CURRENT dimension's own response is a degenerate chart, not a
  // genuinely empty one (build brief finish-item §2) — `degenerateChartMessage` (`overview-
  // usage.ts`) is the one shared decision, computed off `spendSegments`/`spendUnassignedCaption`
  // this hook already has. No extra query.
  const spendDegenerateMessage = useMemo(
    () => degenerateChartMessage(spendSegments, DIMENSION_NOUN[view.groupBy], spendUnassignedCaption),
    [spendSegments, view.groupBy, spendUnassignedCaption]
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

  // Renders through `RankedSeriesRows` now (build brief §7 — replaces the `ShareBar`-based
  // `SpendShareSection` this card used to render through), which needs a per-model day-bucketed
  // trend for its sparkline column, not just a summed total — `toRankedSeriesRows`
  // (`settings-overview-usage.ts`) already does exactly that from a grouped response.
  const modelSpendRows = useMemo(
    () => (modelUsageQuery.data ? toRankedSeriesRows(modelUsageQuery.data, 'model', labelForModel) : []),
    [modelUsageQuery.data, labelForModel]
  );

  // ── #306: BudgetHero — consumption (usage backend, this billing period) vs ceiling (budget
  // microservice's own `getMyBudgetBalance`) ────────────────────────────────────────────────
  // Resolved once per mount, not per render (same "moving default, resolved once" pattern
  // `url-state.ts`'s own `CURRENT_PERIOD` uses at module load) — a calendar-month period changes
  // at most once a session, and this keeps the budget queries' keys stable across re-renders.
  const period = useMemo(() => currentBudgetPeriod(), []);

  // Phase 2d (account-scoping audit): `getMyBudgetBalance` structurally answers for the caller's
  // HOME account only (see `BUDGET_HOME_ACCOUNT_ONLY_NOTE`'s own doc comment) — computed once here
  // and threaded through both the balance query's `enabled` guard and the `budget` memo below, so
  // neither can independently drift into showing the home account's numbers under a different
  // account's label.
  const accountIsHome = isHomeAccount(accountId, session);

  const consumptionQuery = useQuery({
    queryKey: ['usage', 'budget-consumption', accountId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionRequest(accountId, new Date())),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  const balanceQuery = useQuery({
    queryKey: ['budget', 'myBalance', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetBalance({ args: { period } }),
    enabled: Boolean(accountId) && accountIsHome,
    staleTime: 30_000,
  });

  // The ladder query lives in `use-budget-refill.ts`, shared with `/accounts/<id>/refill`
  // (`use-refill-screen.ts`) — this screen only reads it to decide whether the breach button
  // should appear at all (IA v3 phase 3: the button now navigates to that page rather than
  // opening a dialog, so the actual submit, and the mutation that drives it, live there instead).
  const ladder = useBudgetRefillLadder();

  const budget: BudgetSummary = useMemo(() => {
    // Checked FIRST, before either query's own status: a non-home account never fires
    // `balanceQuery` at all (see its `enabled` guard above), so falling through to the ordinary
    // `isPending`/`isError` branches below would render it as a permanently-loading card instead
    // of the honest, explained gap `BudgetSummaryUnwired` is for.
    if (!accountIsHome) {
      return { status: 'unwired', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
    }
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
    accountIsHome,
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

  const accountRefillHref = refillHref(accountId, projectId);

  // IA v3 phase 3 ("refill as a page") — this used to open `RequestRefillDialog` (2026-08-30:
  // before that, it instantly mutated `smallestAmountMicros` on one click with no confirmation
  // surface at all). It now navigates to `/accounts/<id>/refill` instead, which independently
  // preselects the smallest allowed amount (`use-refill-screen.ts`) — a breach is still one click
  // away from a refill request, and the actual submit is a real, dedicated screen, not a dialog
  // three separate triggers had to agree on.
  let refillAction: OverviewScreen['refillAction'];
  if (smallestAmountMicros) {
    refillAction = {
      label: 'Request refill',
      href: accountRefillHref,
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

  return {
    scopeAccountLabel,
    scopeProjectLabel,
    subline: `${RANGE_LABELS[view.range]} · UTC`,
    statCards,
    // `|| scope.loading`: `apiKeys` is disabled (never "loading") until `accountProjectIds`
    // resolves — see `apiKeysCountFilters`'s own guard above — so the stat card must not settle on
    // a false "0 active keys" before scope itself has actually loaded.
    statCardsLoading: projects.query.isLoading || apiKeys.query.isLoading || scope.loading,
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
      options: bucketOptions(
        (usageWindow.end.getTime() - usageWindow.start.getTime()) / 86_400_000
      ),
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
    spendUnassignedCaption: spendUnassignedCaption ?? undefined,
    spendDegenerateMessage,
    spendStatus,
    spendErrorMessage: usageQuery.isError ? getUsageErrorMessage(usageQuery.error) : undefined,
    spendRetry: () => void usageQuery.refetch(),
    modelSpendRows,
    modelSpendStatus,
    modelSpendErrorMessage: modelUsageQuery.isError
      ? getUsageErrorMessage(modelUsageQuery.error)
      : undefined,
    modelSpendRetry: () => void modelUsageQuery.refetch(),
    budget,
    refillHref: accountRefillHref,
    refillAction,
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
  };
}
