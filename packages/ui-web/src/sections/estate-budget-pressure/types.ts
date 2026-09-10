/**
 * Per-section load status — one dashboard failing must never take its neighbour down (the same
 * three-value vocabulary `BudgetPressureStatus` already uses).
 */
export type EstateBudgetPressureStatus = 'ready' | 'loading' | 'error';

export interface EstateBudgetPressureAccount {
  /** Stable identity — the account id, matching the burn-down chart's own series key. */
  key: string;
  /** The account's NAME, never its id (console-ui skill "never a raw account UUID as a visible
   *  label"). */
  name: string;
  /** Spend attributed to this account over the measured period, in USD. */
  spend: number;
  /** This account's OWN ceiling — unlike `BudgetPressure` (one shared ceiling across a single
   *  account's projects), an estate-wide view genuinely has one real ceiling per row, so each row
   *  carries its own rather than being measured against a single figure that would be meaningless
   *  for every account but one. */
  ceiling: number;
  /**
   * The account's next budget reset, already worded by the caller (converse-frontends#451, story
   * C8) — e.g. "Next reset in 3 days → $2.00 (reset)", or "No reset scheduled".
   *
   * A ROW-LEVEL fact, unlike the single line the account Budget card carries, because on an estate
   * view each account resolves its own winning schedule (account > billing_plan > global) and two
   * neighbouring rows genuinely can answer differently. `undefined` while the per-account read is
   * still in flight — never a fabricated "no schedule" for an unanswered query.
   */
  nextReset?: string;
}

export interface EstateBudgetPressureProps {
  /** Uppercase-free dashboard heading; defaults to this section's own wording. */
  label?: string;
  /** Rendered nearest-ceiling first — the section sorts by CONSUMPTION RATIO (spend/ceiling), not
   *  raw spend, since a small account pinned at its ceiling is the one an operator needs to see
   *  before a large account nowhere near its own. Callers pass accounts in any order. */
  accounts: EstateBudgetPressureAccount[];
  /** Fraction (0–1) at/past which a row's meter turns `--signal`. Defaults to `Meter`'s own 0.9. */
  threshold?: number;
  status?: EstateBudgetPressureStatus;
  errorMessage?: string;
  onRetry?: () => void;
  /** Inline status line shown over the still-rendered heading when no account drew anything. */
  emptyMessage?: string;
  /** Skeleton rows rendered while `status="loading"`, matching the final row geometry. */
  loadingRowCount?: number;
  className?: string;
}
