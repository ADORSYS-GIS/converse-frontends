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

export interface BudgetSchedulePreviewProps {
  status: BudgetSchedulePreviewStatus;
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
