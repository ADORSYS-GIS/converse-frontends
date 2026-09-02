import {
  microsToUsdNumber,
  relativeWhen,
  resetScheduleCadenceSentence,
  resetScheduleNextRunLabel,
  resetScheduleScopeSentence,
} from '@lightbridge/ui-web';
import type { BudgetSchedulePreviewEntry } from '@lightbridge/ui-web';
import type {
  ActorAccountLabel,
  BillingPlanInfo,
  BudgetResetSchedule,
  BudgetResetScheduleRunResult,
} from '@lightbridge/authz-rpc';

import { relativeAge } from './refill-rows';

/**
 * The pure wire→view adapters for `/admin/budget-schedules` (converse-frontends#451, story C8),
 * kept out of the hook so every sentence this screen states is unit-testable with no DOM, no query
 * client and no clock of its own (`now` is always a parameter — `refill-rows.ts`'s own convention).
 *
 * Every human-readable string here comes from `@lightbridge/ui-web`'s `lib/reset-schedule.ts`, not
 * from this file: the account Budget card and `/admin/overview`'s budget-pressure rows render the
 * same facts, and a second wording of "Reset remaining to $2.00 every day at 00:00 UTC" in a
 * console container would be a second claim about what the scheduler does. What this module owns
 * is the JOIN — resolving a `scopeId` against the plan catalogue and the actor labels, and folding
 * a run result into the preview's own row shape.
 */

/**
 * The ONE query key every `getEffectiveResetSchedule` read in the console uses.
 *
 * Three surfaces call it — the account Budget card, `/admin/overview`'s per-account budget-pressure
 * rows, and that same page's estate comparison-cadence probe — and two of them routinely ask about
 * the SAME account in the same session. One key means one request and one answer; three ad-hoc keys
 * would mean an operator could see two different "next reset" lines on two zones of one page.
 */
export function effectiveResetScheduleQueryKey(accountId: string) {
  return ['budget', 'effectiveResetSchedule', accountId] as const;
}

/** One ledger row on `/admin/budget-schedules`. */
export interface BudgetScheduleRow {
  id: string;
  name: string;
  /** "All accounts" / "Plan free" / "Account northwind-ai". */
  scope: string;
  /** "Reset remaining to $2.00 every day at 00:00 UTC". */
  cadence: string;
  /** "in 6 h" / "overdue" — relative, because an absolute UTC timestamp in a table cell is a
   *  subtraction the reader has to do. */
  nextRun: string;
  /** "2 days ago", or the em dash for a schedule that has never fired. */
  lastRun: string;
  enabled: boolean;
}

/** A schedule that has never run — an em dash, never "never" and never a fabricated date. */
const NEVER_RUN = '—';

/**
 * Resolves a schedule's `scopeId` to a human label.
 *
 * A billing-plan scope resolves against `listBillingPlans`; an account scope against
 * `resolveActorLabels`. Neither is guaranteed to answer (a plan can be renamed out of the
 * catalogue, an account id can belong to a deleted account), and when neither does the sentence
 * builder falls back to the raw id — see `resetScheduleScopeSentence` for why a blank cell here
 * would be the single most dangerous thing this column could do.
 */
export function scheduleScopeLabel(
  schedule: Pick<BudgetResetSchedule, 'scopeKind' | 'scopeId'>,
  plans: BillingPlanInfo[],
  accountLabels: ActorAccountLabel[]
): string {
  const id = schedule.scopeId ?? '';
  if (schedule.scopeKind === 'billing_plan') {
    const plan = plans.find((candidate) => candidate.id === id);
    return resetScheduleScopeSentence(schedule, plan?.name ?? undefined);
  }
  if (schedule.scopeKind === 'account') {
    const account = accountLabels.find((candidate) => candidate.accountId === id);
    return resetScheduleScopeSentence(schedule, account?.name ?? undefined);
  }
  return resetScheduleScopeSentence(schedule);
}

export function toBudgetScheduleRow(
  schedule: BudgetResetSchedule,
  now: number,
  plans: BillingPlanInfo[],
  accountLabels: ActorAccountLabel[]
): BudgetScheduleRow {
  return {
    id: schedule.id,
    name: schedule.name,
    scope: scheduleScopeLabel(schedule, plans, accountLabels),
    cadence: resetScheduleCadenceSentence(schedule),
    // A DISABLED schedule has a stored `nextRunAt` the scheduler will never reach — rendering it
    // as "in 6 h" would promise a run that is not going to happen.
    nextRun: schedule.enabled ? relativeWhen(schedule.nextRunAt, now) : 'paused',
    lastRun: schedule.lastRunAt ? relativeAge(schedule.lastRunAt, now) : NEVER_RUN,
    enabled: schedule.enabled,
  };
}

/** Every account id a run result mentions — the batch `resolveActorLabels` asks about. */
export function runResultAccountIds(result: BudgetResetScheduleRunResult): string[] {
  return Array.from(new Set(result.entries.map((entry) => entry.budgetAccountId)));
}

/**
 * A dry-run (or real) result's entries, in the preview section's own row shape, capped at `limit`.
 *
 * The cap is applied HERE and the real total is reported separately by the caller, so the section
 * can state "the first 25 of 137" — a truncation the reader is told about, never one that silently
 * makes a 137-account estate change look like a 25-account one.
 */
export function toPreviewEntries(
  result: BudgetResetScheduleRunResult,
  accountLabels: ActorAccountLabel[],
  limit: number
): BudgetSchedulePreviewEntry[] {
  return result.entries.slice(0, limit).map((entry) => {
    const label = accountLabels.find(
      (candidate) => candidate.accountId === entry.budgetAccountId
    )?.name;
    return {
      budgetAccountId: entry.budgetAccountId,
      // Falls back to the id — never a fabricated "Unknown account", which would make two
      // unresolved rows look like the same one.
      accountLabel: label && label.trim() !== '' ? label : entry.budgetAccountId,
      remaining: microsToUsdNumber(entry.remainingMicros),
      delta: microsToUsdNumber(entry.deltaMicros),
    };
  });
}

/**
 * The "next reset" line for one account, from `getEffectiveResetSchedule`'s answer.
 *
 * `null` — meaning "say nothing here" — ONLY while the read has not answered. A resolved absence is
 * the caller's job to word (`NO_RESET_SCHEDULED_LINE`), because the two are different claims and
 * the surfaces render them differently: the Budget card has a four-state prop, an estate row has a
 * single string.
 *
 * `nextRunAt` is read off the ENVELOPE first (`EffectiveResetSchedule.nextRunAt`) and only then off
 * the schedule, because the envelope is what the backend resolved for THIS account — the schedule's
 * own column is the rule's next window, which for a per-account resolution can differ.
 */
export function effectiveResetLabel(
  effective: { schedule?: BudgetResetSchedule | null; nextRunAt?: string | null } | undefined,
  now: number
): string | null {
  const schedule = effective?.schedule;
  if (!schedule) return null;
  const nextRunAt = effective?.nextRunAt ?? schedule.nextRunAt;
  if (!nextRunAt) return null;
  return resetScheduleNextRunLabel(
    { nextRunAt, amountMicros: schedule.amountMicros, mode: schedule.mode },
    now
  );
}
