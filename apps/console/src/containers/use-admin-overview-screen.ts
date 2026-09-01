'use client';

import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import type {
  DashboardStatus,
  DateRangeFieldProps,
  DateRangePreset,
  EstateBudgetPressureAccount,
  EstateBudgetPressureStatus,
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
  OverviewStatCardData,
  ShareBarSegment,
  SpendSeriesSeries,
  TopSpenderRow,
} from '@lightbridge/ui-web';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import { OVERVIEW_RANGES, useAdminOverviewParams } from '../client/url-state';
import { useRefillsQueueScreen } from './use-refills-queue-screen';
import { currentPeriodRange, RANGE_DAYS, resolveOverviewWindow, toUrlDate } from './overview-usage';
import { buildLensDayRequest, toAggregateDaySeries, toLatencyRows } from './settings-overview-usage';
import type { LensLatencyRow } from './settings-overview-usage';
import {
  combineAccountModelResponses,
  MAX_FANNED_OUT_ACCOUNTS,
  modelTotalsToSegments,
  previousWindow,
  toPreviousPeriodSeries,
  truncateShareSegments,
  type AccountUsageResponse,
} from './usage-overview-usage';
import {
  activeAccountsPerDay,
  activeProjectsPerDay,
  ADOPTION_ESTATE_LIMITS_CAPTION,
  adoptionOverTimeSeries,
  budgetPressureAccountIds,
  budgetPressureTruncationCaption,
  buildEstateMtdRequest,
  buildEstateModelRequest,
  buildEstatePreviousRequest,
  buildEstateProjectActivityRequest,
  combineModelDaySeries,
  dayPrecisionLastActiveLabel,
  estateAccountLabel,
  estateProjectLabel,
  requestVolumeSeries,
  spendDelta,
  splitResponseByAccount,
  summarizeMtdUsage,
} from './admin-overview-usage';

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build).
 * Eight boards, composed exactly as the approved page story (`Pages/AdminOverview`,
 * `claude/sb-admin-dashboards`@aaf3fe6) lays them out; this hook supplies the real queries the
 * story's fixtures stood in for.
 *
 * **2026-08-31 estate-wide rewrite (lightbridge-authz#605, owner ruling verbatim: "/admin/overview
 * is overview for ALL account, not just the one the user is bound to. ALL of them." + "Just not
 * mention you're fetching for a specific account.").** The 2026-08-31 correction below this one
 * widened the fan-out to family∪pending-queue accounts, captioned as a real but partial estate.
 * #605 replaces that fan-out entirely: the usage query API now has a genuine estate-wide scope
 * (`scope: 'all', scope_id: ''`, no entity filter at all, gated server-side on the
 * `usage:read-all` permission — granted to `lightbridge-admin`), so every query family below fires
 * exactly ONE request instead of one PER discoverable account. `admin-overview-usage.ts`'s own
 * top-of-file doc comment has the full before/after and the real, residual limits this still
 * carries (no account creation dates outside the operator's own family; a genuinely zero-usage
 * account is invisible to "gone quiet"/"active accounts," since it never appears as an
 * `account_id` group in a usage-events query at all) — both captioned inline
 * (`ADOPTION_ESTATE_LIMITS_CAPTION`) rather than silently dropped. The one board that still fans
 * out per-account is dashboard 4's `getBudgetBalance` half (an RPC, not a usage query, so #605
 * does not touch it) — `budgetPressureAccountIds` sources ITS candidate set from the estate MTD
 * response's own `account_id` groups union the operator's family, concurrency-capped exactly like
 * the pre-#605 fan-out was, with its own honest truncation caption when the cap actually bites.
 *
 * **Query families** (each now ONE `scope: 'all'` request, varying only the `group_by` it needs —
 * see `admin-overview-usage.ts`'s own `buildEstate*Request` doc comments):
 *
 *  1. **Range-scoped, `group_by: [account_id, model]`** — dashboards 1 (estate total + per-account
 *     spend), 2 (model mix, both the `ShareBar` and the over-time board), 6 (request volume), and
 *     8 (active accounts per day, from the same per-account day totals dashboard 1 already
 *     computes). `splitResponseByAccount` turns the one response back into per-account slices for
 *     the adapters (`combineAccountModelResponses`, `activeAccountsPerDay`) that need one.
 *  2. **Range-scoped, ungrouped, PREVIOUS window** — dashboard 1's dashed previous-period line
 *     only; the estate's own summed total needs no account breakdown.
 *  3. **Range-scoped, `group_by: [project_id]`** — dashboard 8's active-projects-per-day half.
 *  4. **Billing-period (MTD), `group_by: [account_id, project_id]`, current AND previous** —
 *     dashboard 3 (top spenders: account + project totals, last-active day, delta) and dashboard
 *     4's spend side (always the billing period, never the page's own range picker).
 *  5. **`getBudgetBalance` per account** (RPC, not a usage query) — dashboard 4's ceiling side,
 *     fanned out to `budgetPressureAccountIds`' union of the MTD response's own account ids and
 *     the operator's family, capped at `MAX_FANNED_OUT_ACCOUNTS` for the same "never fan out
 *     unboundedly" reason the pre-#605 fan-out already established. This is the operator-only
 *     `budget:read` procedure, NOT `getMyBudgetBalance` — an operator genuinely can read any
 *     account's `effectiveBudgetMicros` today, so this has no self-service-domain gap to caption.
 *
 * **Honest omissions, captioned inline rather than fabricated (ADR 0012 D8):**
 *
 *  - Dashboard 5 (refill operations) has no "decisions over time" board and no median-time-to-
 *    decision card: `listPendingAugmentationRequests` is a PENDING-only read path (see
 *    `use-refills-queue-screen.ts`'s own doc comment), and there is no procedure anywhere that
 *    lists DECIDED requests or their decision timestamps. Filed as `lightbridge-authz#556`.
 *  - Dashboard 6 has no error-rate line: `UsageSeriesPoint` carries no error/status field at all
 *    (`openapi/usage.backend.yaml`) — filed as `lightbridge-authz#597`.
 *  - Dashboard 7 (latency) cannot honestly combine per-account percentiles into one estate figure
 *    — percentiles do not average — so it scopes `LatencyStatCards` to the single busiest account
 *    (by MTD spend) rather than fabricating a cross-account blend, captioned and citing
 *    `lightbridge-authz#578`. Deliberately still a single-account `scope: 'account'` query, not
 *    `scope: 'all'`: this board is scoped to one account BY DESIGN, not by a gap #605 closes.
 *  - Dashboard 8's "new accounts this period" stat and the adoption zone's "gone quiet"/"active"
 *    figures carry the two real, structural limits `ADOPTION_ESTATE_LIMITS_CAPTION` states —
 *    see `admin-overview-usage.ts`'s own doc comment for why no query shape can remove them.
 */

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  mtd: 'This month',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};
const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
}));

const TOP_MODEL_COUNT = 5;
const GONE_QUIET_DAYS = 14;

export const REFILL_DECISIONS_UNAVAILABLE_CAPTION =
  'Decision history and median time to decision are not available — the budget service only ' +
  'exposes the pending queue, not a listing of past decisions (lightbridge-authz#556).';

export const REQUEST_ERROR_RATE_UNAVAILABLE_CAPTION =
  'Error rate is not shown — usage events carry no error/status signal today (lightbridge-authz#597).';

export function latencyScopeCaption(accountLabel: string): string {
  return (
    `Shown for ${accountLabel}, the estate's busiest account this period — per-account latency ` +
    'percentiles cannot be combined into one honest estate-wide figure (percentiles do not ' +
    'average), and the usage API has no bulk cross-account read (lightbridge-authz#578).'
  );
}

export interface AdminOverviewScreen {
  subtitle: string;
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  truncationCaption: string | undefined;
  adoptionLimitsCaption: string;

  estateTotalSeries: MultiSeriesSpendSeries[];
  estateTotalStatus: DashboardStatus;
  estateTotalScale: MultiSeriesSpendScale;
  setEstateTotalScale: (scale: MultiSeriesSpendScale) => void;

  estateAccountSeries: MultiSeriesSpendSeries[];
  estateAccountScale: MultiSeriesSpendScale;
  setEstateAccountScale: (scale: MultiSeriesSpendScale) => void;

  modelSegments: ShareBarSegment[];
  modelMixSeries: MultiSeriesSpendSeries[];
  modelMixScale: MultiSeriesSpendScale;
  setModelMixScale: (scale: MultiSeriesSpendScale) => void;

  topSpenders: TopSpenderRow[];
  topSpendersLoading: boolean;
  topSpendersError?: string;
  onRetryTopSpenders: () => void;

  budgetPressureAccounts: EstateBudgetPressureAccount[];
  budgetPressureStatus: EstateBudgetPressureStatus;
  budgetPressureError?: string;
  onRetryBudgetPressure: () => void;
  worstBudgetPressureAccount: EstateBudgetPressureAccount | null;
  worstAccountBurnDown: SpendSeriesSeries[];

  refillStatCards: OverviewStatCardData[];
  refillStatCardsLoading: boolean;

  requestVolumeSeries: MultiSeriesSpendSeries[];
  requestVolumeScale: MultiSeriesSpendScale;
  setRequestVolumeScale: (scale: MultiSeriesSpendScale) => void;

  latencyRows: LensLatencyRow[];
  latencyStatus: DashboardStatus;
  latencyCaption: string | undefined;

  adoptionStatCards: OverviewStatCardData[];
  adoptionStatCardsLoading: boolean;
  adoptionOverTimeSeries: MultiSeriesSpendSeries[];
  adoptionScale: MultiSeriesSpendScale;
  setAdoptionScale: (scale: MultiSeriesSpendScale) => void;

  status: DashboardStatus;
  errorMessage?: string;
  onRetry: () => void;
}

export function useAdminOverviewScreen(): AdminOverviewScreen {
  const scope = useConsoleScope();
  const budgetClient = useConsoleBudgetClient();
  const queue = useRefillsQueueScreen(true);
  const [view, setView] = useAdminOverviewParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );
  const prevWindow = useMemo(() => previousWindow(window), [window]);
  const mtdWindow = useMemo(() => currentPeriodRange(new Date()), []);
  const prevMtdWindow = useMemo(() => previousWindow(mtdWindow), [mtdWindow]);
  const period = useMemo(() => currentBudgetPeriod(), []);

  const allAccounts = scope.allAccounts;

  const labelForAccount = useMemo(
    () => (accountId: string) => estateAccountLabel(accountId, allAccounts),
    [allAccounts]
  );
  const labelForProject = useMemo(
    () => (projectId: string) => estateProjectLabel(projectId, scope.allProjects),
    [scope.allProjects]
  );

  // ── set 1: range-scoped, group_by=[account_id, model] — ONE estate-wide query ───────────────
  const modelQuery = useQuery({
    queryKey: ['admin-overview', 'model', view.range, view.from, view.to],
    queryFn: () => queryUsage(buildEstateModelRequest(window)),
    staleTime: 30_000,
  });

  // ── set 2: range-scoped, ungrouped, previous window ──────────────────────────────────────
  const previousQuery = useQuery({
    queryKey: ['admin-overview', 'previous', view.range, view.from, view.to],
    queryFn: () => queryUsage(buildEstatePreviousRequest(prevWindow)),
    staleTime: 30_000,
  });

  // ── set 3: range-scoped, group_by=[project_id] ───────────────────────────────────────────
  const projectActivityQuery = useQuery({
    queryKey: ['admin-overview', 'project-activity', view.range, view.from, view.to],
    queryFn: () => queryUsage(buildEstateProjectActivityRequest(window)),
    staleTime: 30_000,
  });

  // ── set 4: billing-period (MTD), group_by=[account_id, project_id], current + previous ─────
  const mtdQuery = useQuery({
    queryKey: ['admin-overview', 'mtd', period],
    queryFn: () => queryUsage(buildEstateMtdRequest(mtdWindow)),
    staleTime: 30_000,
  });
  const prevMtdQuery = useQuery({
    queryKey: ['admin-overview', 'prev-mtd', period],
    queryFn: () => queryUsage(buildEstateMtdRequest(prevMtdWindow)),
    staleTime: 30_000,
  });

  const isPending = modelQuery.isPending || previousQuery.isPending;
  const isError = modelQuery.isError || previousQuery.isError;
  const status: DashboardStatus = isError ? 'error' : isPending ? 'loading' : 'ready';
  const errorMessage = isError
    ? getUsageErrorMessage(modelQuery.error ?? previousQuery.error)
    : undefined;

  const modelResponses: AccountUsageResponse[] = useMemo(
    () => (modelQuery.data ? splitResponseByAccount(modelQuery.data) : []),
    [modelQuery.data]
  );
  const projectActivityResponses: AccountUsageResponse[] = useMemo(
    () => (projectActivityQuery.data ? splitResponseByAccount(projectActivityQuery.data) : []),
    [projectActivityQuery.data]
  );
  const mtdResponses: AccountUsageResponse[] = useMemo(
    () => (mtdQuery.data ? splitResponseByAccount(mtdQuery.data) : []),
    [mtdQuery.data]
  );
  const prevMtdResponses: AccountUsageResponse[] = useMemo(
    () => (prevMtdQuery.data ? splitResponseByAccount(prevMtdQuery.data) : []),
    [prevMtdQuery.data]
  );

  // ── dashboard 1 ───────────────────────────────────────────────────────────────────────────
  const combined = useMemo(
    () => combineAccountModelResponses(modelResponses, labelForAccount),
    [modelResponses, labelForAccount]
  );
  const spanMs = window.end.getTime() - window.start.getTime();
  const previousSeries = useMemo(
    () =>
      previousQuery.data
        ? toPreviousPeriodSeries([{ accountId: '', response: previousQuery.data }], spanMs)
        : { key: 'previous-period', label: 'Previous period', points: [] },
    [previousQuery.data, spanMs]
  );
  const estateTotalSeries = useMemo<MultiSeriesSpendSeries[]>(
    () =>
      status === 'ready'
        ? [
            { ...combined.aggregateSeries, key: 'estate-total', label: 'This period' },
            { ...previousSeries, key: 'estate-previous', label: 'Previous period' },
          ]
        : [],
    [status, combined.aggregateSeries, previousSeries]
  );

  // ── dashboard 2 ───────────────────────────────────────────────────────────────────────────
  const modelSegments = useMemo(
    () =>
      truncateShareSegments(
        modelTotalsToSegments(combined.modelTotals),
        TOP_MODEL_COUNT,
        (count) => `Other (${count} models)`
      ),
    [combined.modelTotals]
  );
  const modelMixSeries = useMemo(
    () => (status === 'ready' ? combineModelDaySeries(modelResponses, TOP_MODEL_COUNT) : []),
    [status, modelResponses]
  );

  // ── dashboard 3: top spenders ─────────────────────────────────────────────────────────────
  const topSpendersLoading = mtdQuery.isPending || prevMtdQuery.isPending;
  const topSpendersIsError = mtdQuery.isError || prevMtdQuery.isError;
  const topSpendersError = topSpendersIsError
    ? getUsageErrorMessage(mtdQuery.error ?? prevMtdQuery.error)
    : undefined;
  // The latest of the two MTD queries' own `dataUpdatedAt` — never `Date.now()` (impure at
  // render time), matching every other "ago" label in this console.
  const mtdReadAt = useMemo(() => {
    const timestamps = [mtdQuery.dataUpdatedAt, prevMtdQuery.dataUpdatedAt].filter((t) => t > 0);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  }, [mtdQuery.dataUpdatedAt, prevMtdQuery.dataUpdatedAt]);

  const topSpenders = useMemo<TopSpenderRow[]>(() => {
    if (topSpendersLoading || mtdResponses.length === 0) return [];
    const rows: TopSpenderRow[] = [];
    const prevByAccount = new Map(prevMtdResponses.map((r) => [r.accountId, r.response]));
    for (const { accountId, response } of mtdResponses) {
      const summary = summarizeMtdUsage(response);
      const prevResponse = prevByAccount.get(accountId);
      const prevSummary = prevResponse ? summarizeMtdUsage(prevResponse) : null;
      rows.push({
        key: accountId,
        scope: 'account',
        name: labelForAccount(accountId),
        spendMtd: summary.spend,
        delta: spendDelta(summary.spend, prevSummary?.spend ?? 0),
        lastActiveLabel: dayPrecisionLastActiveLabel(summary.lastActive, mtdReadAt),
      });
      const prevProjectsById = new Map(
        (prevSummary?.projects ?? []).map((p) => [p.projectId, p])
      );
      for (const project of summary.projects) {
        const prevProject = prevProjectsById.get(project.projectId);
        rows.push({
          key: project.projectId,
          scope: 'project',
          name: labelForProject(project.projectId),
          account: labelForAccount(accountId),
          spendMtd: project.spend,
          delta: spendDelta(project.spend, prevProject?.spend ?? 0),
          lastActiveLabel: dayPrecisionLastActiveLabel(project.lastActive, mtdReadAt),
        });
      }
    }
    return rows;
  }, [topSpendersLoading, mtdResponses, prevMtdResponses, labelForAccount, labelForProject, mtdReadAt]);

  // ── dashboard 4: budget pressure ─────────────────────────────────────────────────────────
  // The one board that still fans out per-account (`getBudgetBalance` is an RPC, not a usage
  // query, so #605's scope=all widening does not reach it) — candidate ids are the estate MTD
  // response's own account_id groups (real spend this period) union the operator's family
  // (surfaces a family account's ceiling even before it has drawn anything), concurrency-capped.
  const budgetPressureIds = useMemo(
    () =>
      budgetPressureAccountIds(
        mtdResponses.map((r) => r.accountId),
        allAccounts.map((a) => a.id),
        MAX_FANNED_OUT_ACCOUNTS
      ),
    [mtdResponses, allAccounts]
  );
  const includedIds = budgetPressureIds.ids;

  const balanceQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'balance', accountId, period],
      queryFn: () =>
        budgetClient.procedures.getBudgetBalance({ args: { budgetAccountId: accountId, period } }),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  const balanceByAccount = useMemo(
    () => new Map(balanceQueries.map((q, i) => [includedIds[i], q.data])),
    [balanceQueries, includedIds]
  );
  const mtdByAccount = useMemo(
    () => new Map(mtdResponses.map((r) => [r.accountId, r.response])),
    [mtdResponses]
  );
  const budgetPressureLoading = mtdQuery.isPending || balanceQueries.some((q) => q.isPending);
  const budgetPressureIsError =
    mtdQuery.isError || (balanceQueries.every((q) => q.isError) && includedIds.length > 0);
  const budgetPressureStatus: EstateBudgetPressureStatus = budgetPressureLoading
    ? 'loading'
    : budgetPressureIsError
      ? 'error'
      : 'ready';
  const budgetPressureError = budgetPressureIsError
    ? getUsageErrorMessage(mtdQuery.error)
    : undefined;

  const budgetPressureAccounts = useMemo<EstateBudgetPressureAccount[]>(() => {
    if (budgetPressureStatus !== 'ready') return [];
    const rows: EstateBudgetPressureAccount[] = [];
    for (const accountId of includedIds) {
      const balance = balanceByAccount.get(accountId);
      const usage = mtdByAccount.get(accountId);
      if (!balance || !usage) continue;
      const spend = summarizeMtdUsage(usage).spend;
      const ceiling = Number(balance.effectiveBudgetMicros) / 1_000_000;
      rows.push({ key: accountId, name: labelForAccount(accountId), spend, ceiling });
    }
    return rows;
  }, [budgetPressureStatus, includedIds, balanceByAccount, mtdByAccount, labelForAccount]);

  const worstBudgetPressureAccount = useMemo(() => {
    if (budgetPressureAccounts.length === 0) return null;
    return [...budgetPressureAccounts].sort((a, b) => {
      const ratioA = a.ceiling > 0 ? a.spend / a.ceiling : 0;
      const ratioB = b.ceiling > 0 ? b.spend / b.ceiling : 0;
      return ratioB - ratioA;
    })[0];
  }, [budgetPressureAccounts]);

  const worstAccountBurnDown = useMemo<SpendSeriesSeries[]>(() => {
    if (!worstBudgetPressureAccount) return [];
    const response = mtdByAccount.get(worstBudgetPressureAccount.key);
    if (!response) return [];
    return [toAggregateDaySeries(response, worstBudgetPressureAccount.name)];
  }, [worstBudgetPressureAccount, mtdByAccount]);

  // ── dashboard 5: refill operations ───────────────────────────────────────────────────────
  const refillStatCards = useMemo<OverviewStatCardData[]>(
    () => [{ key: 'queue-depth', label: 'Queue depth', metric: queue.pendingCount.toLocaleString() }],
    [queue.pendingCount]
  );

  // ── dashboard 6: request volume ──────────────────────────────────────────────────────────
  const requestVolume = useMemo(
    () => (status === 'ready' ? requestVolumeSeries(modelResponses) : { series: null, totalRequests: 0 }),
    [status, modelResponses]
  );
  const requestVolumeSeriesValue = useMemo<MultiSeriesSpendSeries[]>(
    () => (requestVolume.series ? [requestVolume.series] : []),
    [requestVolume.series]
  );

  // ── dashboard 7: latency, scoped to the estate's single busiest account ─────────────────
  // Deliberately still `scope: 'account'`, not `scope: 'all'` — this board is single-account BY
  // DESIGN (percentiles cannot be validly combined across accounts), not a gap #605 closes; see
  // this hook's own top-of-file doc comment.
  const busiestAccountId = useMemo(() => {
    if (mtdResponses.length === 0) return null;
    let best: { accountId: string; spend: number } | null = null;
    for (const { accountId, response } of mtdResponses) {
      const spend = summarizeMtdUsage(response).spend;
      if (!best || spend > best.spend) best = { accountId, spend };
    }
    return best?.accountId ?? null;
  }, [mtdResponses]);

  const latencyQuery = useQuery({
    queryKey: ['admin-overview', 'latency', busiestAccountId, view.range, view.from, view.to],
    queryFn: () =>
      queryUsage(buildLensDayRequest({ scope: 'account', scopeId: busiestAccountId as string }, window, 'model')),
    enabled: Boolean(busiestAccountId),
    staleTime: 30_000,
  });
  const latencyStatus: DashboardStatus = !busiestAccountId
    ? 'ready'
    : latencyQuery.isError
      ? 'error'
      : latencyQuery.isPending
        ? 'loading'
        : 'ready';
  const latencyRows = useMemo(
    () => (latencyQuery.data ? toLatencyRows(latencyQuery.data) : []),
    [latencyQuery.data]
  );
  const latencyCaption = busiestAccountId ? latencyScopeCaption(labelForAccount(busiestAccountId)) : undefined;

  // ── dashboard 8: adoption ────────────────────────────────────────────────────────────────
  const activeAccountsByDay = useMemo(
    () => (status === 'ready' ? activeAccountsPerDay(modelResponses) : new Map<number, number>()),
    [status, modelResponses]
  );
  const activeProjectsByDay = useMemo(
    () => (status === 'ready' ? activeProjectsPerDay(projectActivityResponses) : new Map<number, number>()),
    [status, projectActivityResponses]
  );
  const adoptionOverTime = useMemo(
    () => adoptionOverTimeSeries(activeAccountsByDay, activeProjectsByDay),
    [activeAccountsByDay, activeProjectsByDay]
  );

  // "New accounts this period" stays family-only (`ADOPTION_ESTATE_LIMITS_CAPTION` states why:
  // usage events carry no account creation-date field for anyone, family or not).
  const newAccountsThisPeriod = useMemo(
    () => allAccounts.filter((a) => new Date(a.createdAt).getTime() >= window.start.getTime()).length,
    [allAccounts, window]
  );
  const newAccountsPreviousPeriod = useMemo(
    () =>
      allAccounts.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= prevWindow.start.getTime() && t < prevWindow.end.getTime();
      }).length,
    [allAccounts, prevWindow]
  );
  const activeAccountsToday = useMemo(() => {
    const days = Array.from(activeAccountsByDay.keys()).sort((a, b) => b - a);
    return days.length > 0 ? (activeAccountsByDay.get(days[0]) ?? 0) : 0;
  }, [activeAccountsByDay]);
  const goneQuietCount = useMemo(() => {
    if (status !== 'ready' || mtdResponses.length === 0) return 0;
    const now = mtdReadAt.getTime();
    const prevByAccount = new Map(prevMtdResponses.map((r) => [r.accountId, r.response]));
    let count = 0;
    for (const { accountId, response } of mtdResponses) {
      const currentSummary = summarizeMtdUsage(response);
      const prevResponse = prevByAccount.get(accountId);
      const prevSummary = prevResponse ? summarizeMtdUsage(prevResponse) : null;
      const lastActive =
        currentSummary.lastActive && prevSummary?.lastActive
          ? currentSummary.lastActive > prevSummary.lastActive
            ? currentSummary.lastActive
            : prevSummary.lastActive
          : (currentSummary.lastActive ?? prevSummary?.lastActive ?? null);
      const daysIdle = lastActive
        ? Math.floor((now - lastActive.getTime()) / 86_400_000)
        : Number.POSITIVE_INFINITY;
      if (daysIdle >= GONE_QUIET_DAYS) count += 1;
    }
    return count;
  }, [status, mtdResponses, prevMtdResponses, mtdReadAt]);

  const adoptionStatCards = useMemo<OverviewStatCardData[]>(
    () => [
      {
        key: 'new-accounts',
        label: 'New accounts this period',
        metric: newAccountsThisPeriod.toLocaleString(),
        delta: spendDelta(newAccountsThisPeriod, newAccountsPreviousPeriod),
      },
      {
        key: 'gone-quiet',
        label: `Gone quiet (${GONE_QUIET_DAYS}+ days idle)`,
        metric: goneQuietCount.toLocaleString(),
      },
      {
        key: 'active-today',
        label: 'Active accounts today',
        metric: activeAccountsToday.toLocaleString(),
      },
    ],
    [newAccountsThisPeriod, newAccountsPreviousPeriod, goneQuietCount, activeAccountsToday]
  );

  const truncationCaption = budgetPressureTruncationCaption(budgetPressureIds);

  return {
    subtitle: `Operator · All accounts with usage this period · ${RANGE_LABELS[view.range]} · UTC`,
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
    truncationCaption,
    adoptionLimitsCaption: ADOPTION_ESTATE_LIMITS_CAPTION,

    estateTotalSeries,
    estateTotalStatus: status,
    estateTotalScale: view.estateTotalScale,
    setEstateTotalScale: (scale) => void setView({ estateTotalScale: scale }),

    estateAccountSeries: status === 'ready' ? combined.accountSeries : [],
    estateAccountScale: view.estateAccountScale,
    setEstateAccountScale: (scale) => void setView({ estateAccountScale: scale }),

    modelSegments: status === 'ready' ? modelSegments : [],
    modelMixSeries,
    modelMixScale: view.modelMixScale,
    setModelMixScale: (scale) => void setView({ modelMixScale: scale }),

    topSpenders,
    topSpendersLoading,
    topSpendersError,
    onRetryTopSpenders: () => {
      void mtdQuery.refetch();
      void prevMtdQuery.refetch();
    },

    budgetPressureAccounts,
    budgetPressureStatus,
    budgetPressureError,
    onRetryBudgetPressure: () => {
      void mtdQuery.refetch();
      for (const q of balanceQueries) void q.refetch();
    },
    worstBudgetPressureAccount,
    worstAccountBurnDown,

    refillStatCards,
    refillStatCardsLoading: queue.loading,

    requestVolumeSeries: requestVolumeSeriesValue,
    requestVolumeScale: view.requestVolumeScale,
    setRequestVolumeScale: (scale) => void setView({ requestVolumeScale: scale }),

    latencyRows,
    latencyStatus,
    latencyCaption,

    adoptionStatCards,
    adoptionStatCardsLoading: status === 'loading',
    adoptionOverTimeSeries: adoptionOverTime,
    adoptionScale: view.adoptionScale,
    setAdoptionScale: (scale) => void setView({ adoptionScale: scale }),

    status,
    errorMessage,
    onRetry: () => {
      void modelQuery.refetch();
      void previousQuery.refetch();
      void projectActivityQuery.refetch();
      void mtdQuery.refetch();
      void prevMtdQuery.refetch();
      for (const q of balanceQueries) void q.refetch();
      queue.retry();
    },
  };
}
