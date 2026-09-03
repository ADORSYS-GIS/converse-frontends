'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import type { BudgetNextReset, BudgetSummary } from '@lightbridge/ui-web';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { effectiveResetLabel, effectiveResetScheduleQueryKey } from './budget-schedule-rows';
import { DEFAULT_COMPARISON_CADENCE, type ResetCadence } from './comparison-window';
import { buildBudgetConsumptionRequest, sumTotalCost } from './overview-usage';
import { microsToAmount } from './refill-rows';

/**
 * The "Budget & next reset" zone on `/admin/usage/actors/<id>?type=account`, and the comparison
 * cadence every actor page measures "vs previous" against (converse-frontends#449, story C6).
 *
 * **Why it is not a `dashboards.yaml` panel.** Two of its three reads are RPCs — `getBudgetBalance`
 * (the ceiling) and `getEffectiveResetSchedule` (the winning schedule for this account) — and the
 * third, spend-to-date, is over the BILLING PERIOD rather than the page's range picker, because a
 * ceiling is a fact about a calendar month and every panel follows the range. Those are the same
 * two reasons `/admin/overview`'s budget-pressure zone stays hand-written
 * (`use-admin-estate-operations.ts`); inventing an RPC panel type for a third caller would be a
 * worse abstraction than one honest container.
 *
 * **It answers for an ACCOUNT and for nothing else.** A user has no budget and a project has no
 * ceiling of its own (`GetMyBudgetBalanceInput`'s own note: `budget_account_id` is always the
 * account id), so `enabled` is false for the other two actor types and the page omits the zone
 * rather than rendering an empty one.
 *
 * ```mermaid
 * sequenceDiagram
 *     autonumber
 *     participant P as /admin/usage/actors/[id]?type=account
 *     participant H as useActorBudget
 *     participant U as usage backend
 *     participant B as authz-budget
 *
 *     P->>H: accountId, type=account
 *     H->>U: POST /usage/v1/usage/query (scope account, THIS billing period)
 *     H->>B: getBudgetBalance{budgetAccountId, period}
 *     H->>B: getEffectiveResetSchedule{budgetAccountId}
 *     U-->>H: points -> spend to date
 *     B-->>H: effectiveBudgetMicros -> ceiling
 *     B-->>H: winning schedule (account > billing_plan > global), or none
 *     H-->>P: BudgetSummary + BudgetNextReset + ResetCadence
 *     Note over H,P: a failed schedule read is "unknown", NEVER "none" —<br/>they are different claims and only one is a reason to act
 * ```
 *
 * ```mermaid
 * stateDiagram-v2
 *     [*] --> Absent: type = user | project
 *     [*] --> Loading: type = account
 *     Loading --> Ready: balance and spend both answered
 *     Loading --> Failed: either read failed
 *     Failed --> Loading: Retry
 *     Ready --> ScheduledReset: a schedule governs this account
 *     Ready --> NoReset: resolved, and nothing governs it
 *     Ready --> ResetUnknown: the schedule read itself failed
 *     Absent --> [*]
 * ```
 */

/** The fraction of the ceiling at which `BudgetHero` turns `--signal`. The same 0.9 the account
 *  overview uses — a second threshold would mean two screens disagreeing about "near the limit". */
const BUDGET_BREACH_THRESHOLD = 0.9;

/** Said when the schedule read itself failed. Deliberately NOT the "no reset scheduled" line:
 *  "we could not ask" and "there is none" are different claims, and only one is a reason to go
 *  write a schedule. */
export const ACTOR_SCHEDULE_UNREADABLE_CAPTION =
  'Next reset unknown — the reset schedule could not be read for this account.';

export interface ActorBudget {
  /** `true` only for `type=account`; the page omits the whole zone otherwise. */
  present: boolean;
  budget: BudgetSummary;
  nextReset: BudgetNextReset;
  /**
   * What "vs previous" means on this page (decision D-F, owner Q8): the account's own effective
   * reset cadence when a schedule governs it, else the monthly default every estate page uses.
   */
  resetCadence: ResetCadence;
}

/** `budget_reset_schedules.cadence` is a plain wire string, so it is narrowed rather than trusted
 *  — the same guard `use-admin-estate-operations.ts` applies to the estate probe. */
function toResetCadence(cadence: string | undefined): ResetCadence | null {
  return cadence === 'daily' || cadence === 'weekly' || cadence === 'monthly' ? cadence : null;
}

export function useActorBudget(actorId: string, type: string): ActorBudget {
  const budgetClient = useConsoleBudgetClient();
  const isAccount = type === 'account';
  // Resolved once per mount, not per render — a calendar-month period changes at most once a
  // session and this keeps the query keys stable (the `url-state.ts` `CURRENT_PERIOD` idiom).
  const period = useMemo(() => currentBudgetPeriod(), []);
  const now = useMemo(() => new Date(), []);

  const consumptionQuery = useQuery({
    queryKey: ['usage', 'budget-consumption', actorId, period],
    queryFn: () => queryUsage(buildBudgetConsumptionRequest(actorId, now)),
    enabled: isAccount && Boolean(actorId),
    staleTime: 30_000,
  });

  // The ADMIN read, not `getMyBudgetBalance`: that one structurally answers for the caller's own
  // home account, and this page is by definition about somebody else's.
  const balanceQuery = useQuery({
    queryKey: ['budget', 'balance', actorId, period],
    queryFn: () =>
      budgetClient.procedures.getBudgetBalance({ args: { budgetAccountId: actorId, period } }),
    enabled: isAccount && Boolean(actorId),
    staleTime: 30_000,
  });

  // The SHARED key (`effectiveResetScheduleQueryKey`): `/admin/overview`'s fan-out and the account
  // Budget card ask the identical question for the same account, and one key means one answer
  // rather than two zones of the console stating different next resets for one account.
  const scheduleQuery = useQuery({
    queryKey: effectiveResetScheduleQueryKey(actorId),
    queryFn: () =>
      budgetClient.procedures.getEffectiveResetSchedule({ args: { budgetAccountId: actorId } }),
    enabled: isAccount && Boolean(actorId),
    staleTime: 300_000,
    // A forbidden or missing schedule read must not retry-storm a page that works without it.
    retry: false,
  });

  const budget = useMemo<BudgetSummary>(() => {
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
        errorMessage: 'Failed to load this account’s budget ceiling.',
        onRetry: () => void balanceQuery.refetch(),
      };
    }
    if (consumptionQuery.isPending || balanceQuery.isPending) return { status: 'loading' };

    const value = sumTotalCost(consumptionQuery.data);
    const ceiling = microsToAmount(balanceQuery.data.effectiveBudgetMicros);
    const percent = ceiling > 0 ? Math.round((value / ceiling) * 100) : 0;
    return {
      value,
      ceiling,
      threshold: BUDGET_BREACH_THRESHOLD,
      // The BILLING PERIOD, said out loud: every other figure on this page follows the range
      // picker and this one does not, so a reader who does not know that would read the two
      // against each other.
      caption: `account ceiling · ${percent}% used this budget period (not the range above)`,
    };
  }, [consumptionQuery, balanceQuery]);

  const nextReset = useMemo<BudgetNextReset>(() => {
    if (scheduleQuery.isPending) return { status: 'loading' };
    if (scheduleQuery.isError) {
      return { status: 'unavailable', caption: ACTOR_SCHEDULE_UNREADABLE_CAPTION };
    }
    // The FETCH timestamp, not `Date.now()` — the house idiom: reading the clock during render is
    // impure, and "in 3 days" is relative to when the schedule was read.
    const label = effectiveResetLabel(scheduleQuery.data, scheduleQuery.dataUpdatedAt);
    return label ? { status: 'scheduled', label } : { status: 'none' };
  }, [scheduleQuery]);

  const resetCadence = useMemo<ResetCadence>(() => {
    const schedule = scheduleQuery.data?.schedule;
    if (!schedule || !schedule.enabled) return DEFAULT_COMPARISON_CADENCE;
    return toResetCadence(schedule.cadence) ?? DEFAULT_COMPARISON_CADENCE;
  }, [scheduleQuery.data]);

  return { present: isAccount, budget, nextReset, resetCadence };
}
