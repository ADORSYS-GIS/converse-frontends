/**
 * One account's would-be grant, already resolved to labels and USD by the caller
 * (`apps/console`'s `budget-schedule-rows.ts`) — this section never converts a micro-USD string
 * itself, the same "sections take a typed value, not a wire response" contract every other section
 * here follows.
 */
export interface BudgetSchedulePreviewEntry {
  budgetAccountId: string;
  /** The account's resolved name, from `resolveActorLabels`. Falls back to the id — never blank,
   *  and never a fabricated "Unknown account". */
  accountLabel: string;
  /** `effectiveBudget - spendToDate` at plan time, in USD. CAN BE NEGATIVE, for an account that
   *  overspent its grants — that is a real state the backend reports, not an error. */
  remaining: number;
  /** The ledger row this account would get, in USD. Positive is an `automatic` grant; negative is
   *  the `correction` row that clamps an over-funded account back down (the owner's "reset clamps
   *  both ways" ruling). Never zero — the backend drops an account already exactly on target
   *  rather than booking an auditless no-op. */
  delta: number;
}

export type BudgetSchedulePreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * When the schedule fires next and when it last fired — the two facts a reader needs to judge a
 * plan, and the two the list's own relative cells ("in 6 h", "2 days ago") deliberately round off.
 *
 * ABSOLUTE here, relative there, on purpose: a column of UTC timestamps is a subtraction the reader
 * has to do for every row, but a sheet opened on ONE schedule — about to fire an estate-wide grant
 * — is where the exact instant matters. `forced` says the next window is not one the cadence
 * produced; an operator put it there, and it applies once.
 */
export interface BudgetScheduleTiming {
  /** Pre-formatted by the caller (`formatUtcInstant`), e.g. `2026-09-15 09:30 UTC`. */
  nextRun: string;
  /** `true` when `nextRun` is off the schedule's own cadence grid — an operator forced it. */
  nextRunForced: boolean;
  /** Pre-formatted, or the em dash for a schedule that has never fired. */
  lastRun: string;
}

export interface BudgetSchedulePreviewProps {
  status: BudgetSchedulePreviewStatus;
  /** The schedule's own timing, shown in every status — it is a fact about the rule, not about the
   *  run that is or is not in flight. Absent only where the caller has no schedule in hand. */
  timing?: BudgetScheduleTiming;
  /**
   * Whether the run that produced this result wrote nothing. The preview states it either way:
   * "wrote nothing" for a dry run, "written to the ledger" for a real one — the same component
   * renders both, because the two results are the same shape and a reader must never have to
   * guess which one they are looking at.
   */
  dryRun: boolean;
  /** The window the plan was computed for, pre-formatted by the caller. */
  windowLabel?: string;
  /** At most `previewEntryLimit` rows — the caller truncates and reports the real total below. */
  entries: BudgetSchedulePreviewEntry[];
  /** How many entries the RPC actually returned, before this UI's own cap. */
  totalEntryCount: number;
  /** The UI's cap. Stated, not hidden, whenever it actually dropped rows. */
  entryLimit: number;
  /** Accounts whose spend came back Unavailable — no grant was written and the window stays due. */
  deferredCount: number;
  /** Accounts this schedule matches but a MORE SPECIFIC enabled schedule covers. */
  supersededCount: number;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}
