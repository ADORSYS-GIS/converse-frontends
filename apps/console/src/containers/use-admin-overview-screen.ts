'use client';

import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web';
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
import { accountScopeLabel } from './account-label';
import {
  currentPeriodRange,
  isUsageResponseTruncated,
  RANGE_DAYS,
  resolveOverviewWindow,
  safeCost,
  toUrlDate,
} from './overview-usage';
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
  adoptionOverTimeSeries,
  combineModelDaySeries,
  dayPrecisionLastActiveLabel,
  requestVolumeSeries,
  spendDelta,
  summarizeMtdUsage,
} from './admin-overview-usage';

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build).
 * Eight boards, composed exactly as the approved page story (`Pages/AdminOverview`,
 * `claude/sb-admin-dashboards`@aaf3fe6) lays them out; this hook supplies the real queries the
 * story's fixtures stood in for.
 *
 * **Query families** (all fanned out to `MAX_FANNED_OUT_ACCOUNTS` accounts, the same real-not-
 * ranked selection and honest truncation caption `usage-overview-usage.ts` already establishes —
 * `lightbridge-authz#578` is the filed gap behind both the account cap and the latency board's own
 * single-account scope below):
 *
 *  1. **Range-scoped, `group_by: model`** — dashboards 1 (estate total + per-account spend), 2
 *     (model mix, both the `ShareBar` and the over-time board), 6 (request volume), and 8 (active
 *     accounts per day, from the same per-account day totals dashboard 1 already computes).
 *  2. **Range-scoped, ungrouped, PREVIOUS window** — dashboard 1's dashed previous-period line
 *     only (mirrors `use-usage-overview-screen.ts`'s own previous-period fan-out exactly).
 *  3. **Range-scoped, `group_by: project_id`** — dashboard 8's active-projects-per-day half.
 *  4. **Billing-period (MTD), `group_by: project_id`, current AND previous** — dashboard 3 (top
 *     spenders: account + project totals, last-active day, delta) and dashboard 4's spend side
 *     (always the billing period, never the page's own range picker — the same
 *     "budget is this billing period" rule `overview-usage.ts`'s `buildBudgetConsumptionRequest`
 *     states).
 *  5. **`getBudgetBalance` per account** (RPC, not a usage query) — dashboard 4's ceiling side.
 *     This is the operator-only `budget:read` procedure, NOT `getMyBudgetBalance` — unlike the
 *     self-service budget domain's home-account-only gap (`lightbridge-authz#577`,
 *     `use-budget-refill.ts`'s `BUDGET_HOME_ACCOUNT_ONLY_NOTE`), that ticket explicitly rules
 *     admin (`budget:read`) behavior OUT of scope: an operator genuinely can read any account's
 *     `effectiveBudgetMicros` today, so this dashboard has no equivalent gap to caption.
 *
 * **Two honest omissions, both captioned inline rather than fabricated (ADR 0012 D8):**
 *
 *  - Dashboard 5 (refill operations) has no "decisions over time" board and no median-time-to-
 *    decision card: `listPendingAugmentationRequests` is a PENDING-only read path (see
 *    `use-refills-queue-screen.ts`'s own doc comment — the identical reason Phase 6 deleted the
 *    fabricated Decided tab), and there is no procedure anywhere that lists DECIDED requests or
 *    their decision timestamps. Filed as `lightbridge-authz#556` ("List decided augmentation
 *    requests"). Only queue depth (`useRefillsQueueScreen`'s own `pendingCount`) is real.
 *  - Dashboard 6 has no error-rate line: `UsageSeriesPoint` carries no error/status field at all
 *    (`openapi/usage.backend.yaml`) — filed as `lightbridge-authz#597`.
 *  - Dashboard 7 (latency) cannot honestly combine per-account percentiles into one estate figure
 *    — percentiles do not average — so it scopes `LatencyStatCards` to the single busiest account
 *    (by MTD spend) rather than fabricating a cross-account blend, captioned and citing
 *    `lightbridge-authz#578` (the same "no multi-account/bulk usage query" gap the account cap
 *    already cites).
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
  const included = useMemo(() => allAccounts.slice(0, MAX_FANNED_OUT_ACCOUNTS), [allAccounts]);
  const includedIds = useMemo(() => included.map((a) => a.id), [included]);

  const labelForAccount = useMemo(
    () => (accountId: string) => {
      const account = allAccounts.find((a) => a.id === accountId);
      return account ? accountScopeLabel(account) : accountId;
    },
    [allAccounts]
  );

  // ── set 1: range-scoped, group_by=model ──────────────────────────────────────────────────
  const modelQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'model', accountId, view.range, view.from, view.to],
      queryFn: () => queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, window, 'model')),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  // ── set 2: range-scoped, ungrouped, previous window ──────────────────────────────────────
  const previousQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'previous', accountId, view.range, view.from, view.to],
      queryFn: () => queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, prevWindow)),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  // ── set 3: range-scoped, group_by=project_id ─────────────────────────────────────────────
  const projectActivityQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'project-activity', accountId, view.range, view.from, view.to],
      queryFn: () =>
        queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, window, 'project_id')),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  // ── set 4: billing-period (MTD), group_by=project_id, current + previous ────────────────
  const mtdQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'mtd', accountId, period],
      queryFn: () =>
        queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, mtdWindow, 'project_id')),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });
  const prevMtdQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'prev-mtd', accountId, period],
      queryFn: () =>
        queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, prevMtdWindow, 'project_id')),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  // ── set 5: per-account budget balance (RPC) ──────────────────────────────────────────────
  const balanceQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-overview', 'balance', accountId, period],
      queryFn: () =>
        budgetClient.procedures.getBudgetBalance({ args: { budgetAccountId: accountId, period } }),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  const isPending =
    modelQueries.some((q) => q.isPending) || previousQueries.some((q) => q.isPending);
  const isError = modelQueries.some((q) => q.isError) || previousQueries.some((q) => q.isError);
  const status: DashboardStatus =
    includedIds.length === 0 ? 'ready' : isError ? 'error' : isPending ? 'loading' : 'ready';
  const errorMessage = isError
    ? getUsageErrorMessage(
        modelQueries.find((q) => q.isError)?.error ?? previousQueries.find((q) => q.isError)?.error
      )
    : undefined;

  const modelResponses: AccountUsageResponse[] = useMemo(
    () =>
      modelQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [modelQueries, includedIds]
  );
  const previousResponses: AccountUsageResponse[] = useMemo(
    () =>
      previousQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [previousQueries, includedIds]
  );
  const projectActivityResponses: AccountUsageResponse[] = useMemo(
    () =>
      projectActivityQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [projectActivityQueries, includedIds]
  );

  // ── dashboard 1 ───────────────────────────────────────────────────────────────────────────
  const combined = useMemo(
    () => combineAccountModelResponses(modelResponses, labelForAccount),
    [modelResponses, labelForAccount]
  );
  const spanMs = window.end.getTime() - window.start.getTime();
  const previousSeries = useMemo(
    () => toPreviousPeriodSeries(previousResponses, spanMs),
    [previousResponses, spanMs]
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
  const mtdResponses = useMemo(
    () =>
      mtdQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [mtdQueries, includedIds]
  );
  const prevMtdResponses = useMemo(
    () =>
      prevMtdQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [prevMtdQueries, includedIds]
  );
  const topSpendersLoading = mtdQueries.some((q) => q.isPending) || prevMtdQueries.some((q) => q.isPending);
  const topSpendersIsError = mtdQueries.some((q) => q.isError) || prevMtdQueries.some((q) => q.isError);
  const topSpendersError = topSpendersIsError
    ? getUsageErrorMessage(mtdQueries.find((q) => q.isError)?.error ?? prevMtdQueries.find((q) => q.isError)?.error)
    : undefined;
  // The latest of every included fan-out's own `dataUpdatedAt` — never `Date.now()` (impure at
  // render time), matching every other "ago" label in this console.
  const mtdReadAt = useMemo(() => {
    const timestamps = mtdQueries.map((q) => q.dataUpdatedAt).filter((t) => t > 0);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  }, [mtdQueries]);

  const labelForProject = useMemo(
    () => (projectId: string) => scope.allProjects.find((p) => p.id === projectId)?.name ?? projectId,
    [scope.allProjects]
  );

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
  const balanceByAccount = useMemo(
    () => new Map(balanceQueries.map((q, i) => [includedIds[i], q.data])),
    [balanceQueries, includedIds]
  );
  const mtdByAccount = useMemo(
    () => new Map(mtdResponses.map((r) => [r.accountId, r.response])),
    [mtdResponses]
  );
  const budgetPressureLoading =
    mtdQueries.some((q) => q.isPending) || balanceQueries.some((q) => q.isPending);
  const budgetPressureIsError =
    (mtdQueries.every((q) => q.isError) && includedIds.length > 0) ||
    (balanceQueries.every((q) => q.isError) && includedIds.length > 0);
  const budgetPressureStatus: EstateBudgetPressureStatus = budgetPressureLoading
    ? 'loading'
    : budgetPressureIsError
      ? 'error'
      : 'ready';
  const budgetPressureError = budgetPressureIsError
    ? getUsageErrorMessage(mtdQueries.find((q) => q.isError)?.error)
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

  const truncationCaption =
    allAccounts.length > MAX_FANNED_OUT_ACCOUNTS
      ? `Showing the top ${MAX_FANNED_OUT_ACCOUNTS} of ${allAccounts.length} accounts.`
      : undefined;

  return {
    subtitle: `Operator · Estate-wide · ${RANGE_LABELS[view.range]} · UTC`,
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
      for (const q of mtdQueries) void q.refetch();
      for (const q of prevMtdQueries) void q.refetch();
    },

    budgetPressureAccounts,
    budgetPressureStatus,
    budgetPressureError,
    onRetryBudgetPressure: () => {
      for (const q of mtdQueries) void q.refetch();
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
      for (const q of modelQueries) void q.refetch();
      for (const q of previousQueries) void q.refetch();
      for (const q of projectActivityQueries) void q.refetch();
      for (const q of mtdQueries) void q.refetch();
      for (const q of prevMtdQueries) void q.refetch();
      for (const q of balanceQueries) void q.refetch();
      queue.retry();
    },
  };
}
