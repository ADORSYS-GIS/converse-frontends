'use client';

import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { NO_RESET_SCHEDULED_LINE } from '@lightbridge/ui-web';
import type {
  EstateBudgetPressureAccount,
  EstateBudgetPressureStatus,
  OverviewStatCardData,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import type { ResetCadence } from './comparison-window';
import { DEFAULT_COMPARISON_CADENCE } from './comparison-window';
import {
  budgetPressureAccountIds,
  budgetPressureTruncationCaption,
  buildEstateMtdRequest,
  estateAccountLabel,
  splitResponseByAccount,
  summarizeMtdSpend,
} from './admin-estate-operations-usage';
import { budgetPeriodCaption } from './budget-period-caption';
import { effectiveResetLabel, effectiveResetScheduleQueryKey } from './budget-schedule-rows';
import { currentPeriodRange, toUrlDate } from './overview-usage';
import { toAggregateDaySeries } from './settings-overview-usage';
import { MAX_FANNED_OUT_ACCOUNTS } from './account-family';
import { useRefillsQueueScreen } from './use-refills-queue-screen';

/**
 * The two `/admin/overview` zones the declarative engine does NOT draw, plus the one page-level
 * fact it needs from the budget domain (converse-frontends#447, story C4).
 *
 * Everything else on that page is a `dashboards.yaml` panel now. What is left here is exactly what
 * is not a usage query:
 *
 *  1. **Budget pressure** — `getBudgetBalance`, an RPC, one call per account, beside the
 *     per-account month-to-date spend the usage API does provide. Always the BILLING PERIOD, never
 *     the page's range picker (see `buildEstateMtdRequest`), which is a second reason it cannot be
 *     a panel: every panel follows the range.
 *  2. **Refill queue depth** — `listPendingAugmentationRequests`, likewise an RPC, and likewise
 *     pending-only (`REFILL_DECISIONS_UNAVAILABLE_CAPTION` states the gap).
 *  3. **The estate's comparison cadence** — `getEffectiveResetSchedule` (lane A6). Not a zone at
 *     all: it is what tells `comparisonWindow` whether "vs previous" on this page means a week or
 *     a month (decision D-F, owner Q8). See `resetCadence` below for why an estate page probes it
 *     the way it does.
 *
 * Deliberately NOT a second `use-admin-overview-screen.ts`: it owns no chart series, no scale
 * knobs, no range state and no adapters for anything the engine can draw. If a future backend adds
 * an estate-wide budget-pressure query, this hook disappears rather than growing.
 */

export interface AdminEstateOperations {
  /** Dashboard 4, spend vs ceiling per account. */
  budgetPressureAccounts: EstateBudgetPressureAccount[];
  budgetPressureStatus: EstateBudgetPressureStatus;
  budgetPressureError?: string;
  onRetryBudgetPressure: () => void;
  /** The highest spend-to-ceiling ratio, whose burn-down the zone plots beside the list. */
  worstBudgetPressureAccount: EstateBudgetPressureAccount | null;
  worstAccountBurnDown: SpendSeriesSeries[];
  /** Only present when the RPC fan-out's cap actually dropped real candidates. */
  truncationCaption: string | undefined;

  /** Dashboard 5, the pending refill queue's depth. */
  refillStatCards: OverviewStatCardData[];
  refillStatCardsLoading: boolean;

  /**
   * The cadence every `compare: true` panel on this page measures "previous" against. Never
   * `undefined` — an estate page with no resolvable schedule falls back to monthly.
   */
  resetCadence: ResetCadence;

  /**
   * What window the budget zones above are measured over, and what a reset does to a ceiling —
   * the one shared sentence (`budget-period-caption.ts`), built here from the same GLOBAL probe
   * that sets `resetCadence`.
   *
   * A global schedule only, for the identical reason: an account- or plan-scoped schedule governs
   * one account, and stating its cadence on a page showing every account's ceilings would describe
   * the estate by one member of it.
   */
  budgetPeriodCaption: string;
}

/** Said when the per-account schedule read itself failed. Deliberately NOT `NO_RESET_SCHEDULED_LINE`:
 *  "we could not ask" and "there is none" are different claims, and only one of them is a reason to
 *  go write a schedule. */
export const SCHEDULE_UNREADABLE_LINE = 'Next reset unknown — the schedule read failed';

/** `budget_reset_schedules.cadence` is a plain wire string (the schema keeps the Rust enum's own
 *  rendering rather than a generated union), so it is narrowed here rather than trusted. */
function toResetCadence(cadence: string | undefined): ResetCadence | null {
  return cadence === 'daily' || cadence === 'weekly' || cadence === 'monthly' ? cadence : null;
}

export function useAdminEstateOperations(): AdminEstateOperations {
  const scope = useConsoleScope();
  const budgetClient = useConsoleBudgetClient();
  const queue = useRefillsQueueScreen(true);

  const mtdWindow = useMemo(() => currentPeriodRange(new Date()), []);
  const period = useMemo(() => currentBudgetPeriod(), []);
  const allAccounts = scope.allAccounts;
  const labelForAccount = useMemo(
    () => (accountId: string) => estateAccountLabel(accountId, allAccounts),
    [allAccounts]
  );

  const mtdQuery = useQuery({
    queryKey: ['admin-estate-operations', 'mtd', period],
    queryFn: () => queryUsage(buildEstateMtdRequest(mtdWindow)),
    staleTime: 30_000,
  });

  const mtdResponses = useMemo(
    () => (mtdQuery.data ? splitResponseByAccount(mtdQuery.data) : []),
    [mtdQuery.data]
  );

  const estateIds = useMemo(
    () =>
      budgetPressureAccountIds(
        mtdResponses.map((r) => r.accountId),
        allAccounts.map((a) => a.id),
        MAX_FANNED_OUT_ACCOUNTS
      ),
    [mtdResponses, allAccounts]
  );
  const includedIds = estateIds.ids;

  const balanceQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['admin-estate-operations', 'balance', accountId, period],
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

  const loading = mtdQuery.isPending || balanceQueries.some((q) => q.isPending);
  const isError =
    mtdQuery.isError || (includedIds.length > 0 && balanceQueries.every((q) => q.isError));
  const budgetPressureStatus: EstateBudgetPressureStatus = loading
    ? 'loading'
    : isError
      ? 'error'
      : 'ready';

  const budgetPressureAccounts = useMemo<EstateBudgetPressureAccount[]>(() => {
    if (budgetPressureStatus !== 'ready') return [];
    const rows: EstateBudgetPressureAccount[] = [];
    for (const accountId of includedIds) {
      const balance = balanceByAccount.get(accountId);
      const usage = mtdByAccount.get(accountId);
      // An account whose balance RPC failed is dropped rather than shown with a fabricated
      // ceiling of 0, which would read as "already over budget".
      if (!balance || !usage) continue;
      rows.push({
        key: accountId,
        name: labelForAccount(accountId),
        spend: summarizeMtdSpend(usage),
        ceiling: Number(balance.effectiveBudgetMicros) / 1_000_000,
      });
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

  /**
   * The estate's comparison cadence (decision D-F; owner Q8: "estate pages use the global
   * schedule's cadence if one exists, else monthly").
   *
   * There is no estate-wide read of the schedule table at `budget:read`, and an estate page has no
   * single actor to ask about — so it probes with the account it does have (the operator's own
   * current scope) and accepts the answer ONLY when the winning schedule is `global`. An
   * account-scoped or plan-scoped schedule governs that one account, not the estate, and letting
   * it set the page's cadence would silently redefine "vs previous" for every other account's
   * numbers. Anything else — no schedule, a scoped schedule, an unreadable cadence string, a
   * failed call — falls through to monthly, which is the budget domain's own calendar-month
   * `Period` and this console's default `mtd` range.
   */
  const probeAccountId = scope.value.accountId;

  /**
   * ONE fan-out over `getEffectiveResetSchedule`, serving two readers (converse-frontends#451,
   * story C8 — this replaces the single-account probe this hook used to fire):
   *
   *  1. **Every budget-pressure row's own "next reset" line.** The winner for an account is
   *     account > billing_plan > global and the BACKEND resolves it, so two neighbouring rows
   *     genuinely can answer differently and there is no estate-wide read that could answer for
   *     all of them at once.
   *  2. **The estate comparison cadence** (decision D-F, owner Q8), which is what tells
   *     `comparisonWindow` whether "vs previous" on this page means a week or a month.
   *
   * Capped by construction: the id list is `includedIds`, already `MAX_FANNED_OUT_ACCOUNTS`-capped
   * by `budgetPressureAccountIds`, plus the probe account. The key is the shared
   * `effectiveResetScheduleQueryKey`, so the account Budget card asking about the same account in
   * the same session reuses this answer rather than firing a second request and possibly rendering
   * a different line for it.
   */
  const scheduleIds = useMemo(
    () => Array.from(new Set([...includedIds, probeAccountId].filter(Boolean) as string[])),
    [includedIds, probeAccountId]
  );

  const scheduleQueries = useQueries({
    queries: scheduleIds.map((accountId) => ({
      queryKey: effectiveResetScheduleQueryKey(accountId),
      queryFn: () =>
        budgetClient.procedures.getEffectiveResetSchedule({
          args: { budgetAccountId: accountId },
        }),
      staleTime: 300_000,
      // A missing/forbidden schedule read must not retry-storm a page that works fine without it.
      retry: false,
    })),
  });

  const scheduleByAccount = useMemo(
    () => new Map(scheduleQueries.map((query, index) => [scheduleIds[index], query])),
    [scheduleQueries, scheduleIds]
  );

  /**
   * The estate's comparison cadence (owner Q8: "estate pages use the global schedule's cadence if
   * one exists, else monthly").
   *
   * There is no estate-wide read of the schedule table, and an estate page has no single actor to
   * ask about — so it reads the answer for the account it does have (the operator's own current
   * scope) and accepts it ONLY when the winning schedule is `global`. An account-scoped or
   * plan-scoped schedule governs that one account, not the estate, and letting it set the page's
   * cadence would silently redefine "vs previous" for every other account's numbers. Anything else
   * — no schedule, a scoped schedule, an unreadable cadence string, a failed call — falls through
   * to monthly, which is the budget domain's own calendar-month `Period` and this console's default
   * `mtd` range.
   */
  const globalProbe = useMemo(() => {
    const query = probeAccountId ? scheduleByAccount.get(probeAccountId) : undefined;
    const schedule = query?.data?.schedule;
    if (!schedule || schedule.scopeKind !== 'global' || !schedule.enabled) return null;
    return {
      schedule,
      nextRunAt: query?.data?.nextRunAt ?? schedule.nextRunAt,
      readAt: query?.dataUpdatedAt,
    };
  }, [scheduleByAccount, probeAccountId]);

  const resetCadence = useMemo<ResetCadence>(
    () =>
      globalProbe
        ? (toResetCadence(globalProbe.schedule.cadence) ?? DEFAULT_COMPARISON_CADENCE)
        : DEFAULT_COMPARISON_CADENCE,
    [globalProbe]
  );

  /**
   * The rows the zone actually renders — the pressure rows above, each carrying its own next-reset
   * line (story C8).
   *
   * Three distinct states, worded as three distinct things:
   *  - still resolving → NO line at all (never a fabricated "no schedule" for an unanswered query);
   *  - resolved, covered → the schedule's own sentence;
   *  - resolved, uncovered → `NO_RESET_SCHEDULED_LINE`, an explicit statement rather than blank
   *    space, which beside a balance reads as "it will be topped up somehow";
   *  - the read itself failed → said so, because "we could not ask" is not "there is none".
   */
  const budgetPressureRows = useMemo<EstateBudgetPressureAccount[]>(
    () =>
      budgetPressureAccounts.map((row) => {
        const query = scheduleByAccount.get(row.key);
        if (!query || query.isPending) return row;
        if (query.isError) return { ...row, nextReset: SCHEDULE_UNREADABLE_LINE };
        // Each row's own FETCH timestamp, not `Date.now()` — the house idiom
        // (`use-refills-queue-screen.ts`): reading the clock during render is impure, and "in 6 h"
        // is relative to when THAT account's schedule was read.
        return {
          ...row,
          nextReset:
            effectiveResetLabel(query.data, query.dataUpdatedAt) ?? NO_RESET_SCHEDULED_LINE,
        };
      }),
    [budgetPressureAccounts, scheduleByAccount]
  );

  return {
    budgetPressureAccounts: budgetPressureRows,
    budgetPressureStatus,
    budgetPressureError: isError ? getUsageErrorMessage(mtdQuery.error) : undefined,
    onRetryBudgetPressure: () => {
      void mtdQuery.refetch();
      for (const q of balanceQueries) void q.refetch();
    },
    worstBudgetPressureAccount,
    worstAccountBurnDown,
    truncationCaption: budgetPressureTruncationCaption(estateIds),

    refillStatCards: [
      { key: 'queue-depth', label: 'Queue depth', metric: queue.pendingCount.toLocaleString() },
    ],
    refillStatCardsLoading: queue.loading,

    resetCadence,
    budgetPeriodCaption: budgetPeriodCaption({
      periodStart: toUrlDate(mtdWindow.start),
      schedule: globalProbe ? { ...globalProbe.schedule, nextRunAt: globalProbe.nextRunAt } : null,
      now: globalProbe?.readAt,
    }),
  };
}
