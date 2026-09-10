import {
  formatUsd,
  microsToUsdNumber,
  relativeWhen,
  resetScheduleCadenceSentence,
} from '@lightbridge/ui-web';
import type { ResetScheduleFacts } from '@lightbridge/ui-web';

/**
 * The ONE sentence every surface uses to say what window a budget figure is measured over
 * (converse-frontends#451; owner question, 2026-09-03: "We said ceiling is a fact of the budget
 * period, right? What is ceiling vs reset period?").
 *
 * **What the old copy got wrong.** Four surfaces each carried their own wording of
 * "…measured over the billing period (2026-09-01 → today), not the range picked above — a ceiling
 * is a fact about this calendar month." Two problems, and the owner found both:
 *
 *  1. **"billing period" is not the domain's word.** The ledger's `Period`
 *     (`crates/lightbridge-authz-budget/src/period.rs`) is a clock-free `YYYY-MM` string — the
 *     BUDGET period. Nothing in this product bills against it; calling it a billing period invites
 *     a reader to look for an invoice that does not exist.
 *  2. **"a ceiling is a fact about this calendar month" is false under a reset schedule.** It was
 *     true of the world before ADR-0032. A reset schedule (`reset_scheduler.rs`) does not create a
 *     new period at each tick: it writes an `automatic` grant INTO THE CURRENT MONTH sized so that
 *     `remaining` (= ceiling − spend-to-date) lands back on the configured amount. So under a daily
 *     reset the ceiling is a MONTHLY CUMULATIVE that STEPS UP once a day, and a reader who was told
 *     it is "a fact about this calendar month" will read a $60 ceiling on a $2/day account as an
 *     allowance somebody granted, rather than as thirty $2 days already booked.
 *
 * **The two concepts, stated apart, which is what the owner asked for.**
 *
 *  - **Ceiling** (`budget_balances.effective_budget_micros`) — the SUM of every grant booked into
 *    this calendar month. Monotonically grows within a month, resets to nothing when the month
 *    rolls over, and moves at every reset tick.
 *  - **Reset period** (the schedule's cadence) — how often `remaining` is RE-ESTABLISHED. It is
 *    not a period the ceiling is measured over; it is a cadence that keeps adding to it.
 *
 * `remaining` is the only figure that behaves the way a reader expects a "budget" to: it saw-tooths
 * back to the configured amount at each tick, and it is what this console calls "Budget remaining".
 *
 * ```mermaid
 * stateDiagram-v2
 *     direction LR
 *     [*] --> MonthOpen: period rolls over (ceiling = 0, remaining = 0)
 *     MonthOpen --> Funded: reset tick — automatic grant, ceiling += delta, remaining = $2.00
 *     Funded --> Drawn: requests spend against it (remaining falls, ceiling unchanged)
 *     Drawn --> Funded: next reset tick — ceiling STEPS UP again, remaining back to $2.00
 *     Drawn --> MonthOpen: month rolls over — a NEW Period row, ceiling starts from zero
 *     note right of Funded
 *       ceiling = Σ grants this month (steps up per tick)
 *       remaining = ceiling − spend-to-date (saw-tooths)
 *     end note
 * ```
 *
 * Deliberately a pure function taking `now` as a parameter, like every other adapter in this
 * directory: reading the clock during render is impure, and "next in 6 h" is relative to when the
 * schedule was READ, not to when React happened to re-render.
 */

/** The schedule half of the caption — `getEffectiveResetSchedule`'s answer, structurally.
 *  `nextRunAt` is the ENVELOPE's (resolved for THIS account) and falls back to the schedule's own,
 *  the same precedence `effectiveResetLabel` applies. */
export interface BudgetPeriodCaptionSchedule extends ResetScheduleFacts {
  nextRunAt?: string | null;
}

export interface BudgetPeriodCaptionInput {
  /** The budget period's first day as `YYYY-MM-DD` — `toUrlDate(currentPeriodRange(now).start)`. */
  periodStart: string;
  /** The winning schedule for this scope, or `null`/`undefined` when there is none (or the read
   *  has not answered, or was refused — none of which may claim a cadence that is not there). */
  schedule?: BudgetPeriodCaptionSchedule | null;
  /** When `schedule` was read, for the relative "next …" phrase. Required only with a schedule. */
  now?: number;
}

/** The clause that follows the cadence sentence — what a tick actually does to the two figures.
 *  Worded per MODE, because `top_up` does the opposite of what "returns to $X" claims. */
function tickClause(mode: string, amount: string): string {
  if (mode === 'reset') {
    return (
      `each reset is booked into this month, so the remaining balance returns to ${amount} ` +
      'while the ceiling grows by every reset'
    );
  }
  if (mode === 'top_up') {
    return (
      `each top up is booked into this month, so the remaining balance rises by ${amount} ` +
      'and the ceiling grows with it'
    );
  }
  // An unrecognised mode names no verb of its own — the one thing still true of any grant the
  // scheduler writes is that it lands in this month's ceiling.
  return 'each tick is booked into this month, so the ceiling grows by every one';
}

export function budgetPeriodCaption({
  periodStart,
  schedule,
  now,
}: BudgetPeriodCaptionInput): string {
  if (!schedule) {
    return (
      `Budget figures follow the account's budget period (calendar month, ${periodStart} → ` +
      'today); the range picker above only changes the usage charts.'
    );
  }

  const amount = formatUsd(microsToUsdNumber(schedule.amountMicros));
  const nextRunAt = schedule.nextRunAt;
  // No `nextRunAt` (a disabled or never-scheduled row) states the cadence without inventing a
  // date — "next unknown" would be a claim, and a fabricated one is worse than a missing clause.
  const next = nextRunAt && now !== undefined ? ` (next ${relativeWhen(nextRunAt, now)})` : '';

  return (
    `Budget figures follow the budget period (calendar month, ${periodStart} → today). ` +
    `${resetScheduleCadenceSentence(schedule)}${next} — ${tickClause(schedule.mode, amount)}. ` +
    'The range picker above only changes the usage charts.'
  );
}

/** The Budget card's "Spent since last reset" line (converse-frontends#451, owner 2026-09-03).
 *
 *  It exists because "Budget remaining" is ceiling − MONTH-to-date spend — the ledger's own truth,
 *  and not something this console may quietly redefine — while an operator under a daily reset is
 *  usually asking "how much of today's $2 is gone". Those are two different numbers, so they are
 *  two rows, and this one names its own window rather than leaving the reader to assume.
 *
 *  `sinceLabel` is the caller's relative phrase for `lastRunAt` ("2 h ago"), or the period-start
 *  wording when the schedule has never fired — never a blank window. */
export function spentSinceResetLabel(spend: string, sinceLabel: string): string {
  return `Spent since last reset ${spend} · ${sinceLabel}`;
}

/** What `spentSinceResetLabel` says when the schedule has not fired yet in this period — the
 *  window is then the period start, which is exactly the month-to-date figure above it. */
export const SINCE_PERIOD_START_LABEL = 'since the period started (no reset has fired yet)';
