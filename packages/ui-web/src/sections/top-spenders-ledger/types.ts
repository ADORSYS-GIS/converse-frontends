import type { StatCardDelta } from '../../components/stat-card';

/** The two entity kinds an estate-wide "top spenders" ranking mixes on one ledger — an operator
 *  reading "who is drawing the most" cares about both, and splitting them into two tables would
 *  make the actual rank order (which this ledger's whole point is) invisible. */
export type TopSpenderScope = 'account' | 'project';

export type TopSpenderRow = {
  /** Stable identity — the account/project id. */
  key: string;
  scope: TopSpenderScope;
  /** Resolved display name — never a raw id (console-ui skill "never a raw account UUID as a
   *  visible label"). A project row also carries its owning account, since the same project name
   *  is not unique estate-wide. */
  name: string;
  /** The owning account's name, shown only for `scope: 'project'` rows — omitted for an account
   *  row, which already IS the account. */
  account?: string;
  spendMtd: number;
  /** Deltas are never green/red — direction is carried by the glyph and wording alone, the same
   *  contract `StatCard.delta` already states. */
  delta: StatCardDelta;
  /** Pre-formatted relative time ("3 minutes ago", "9 days ago") — the caller resolves the
   *  timestamp, this ledger only renders the string, same contract `RefillRequestRow.submittedAgo`
   *  already uses. `'Never active'` for a row with no usage at all. */
  lastActiveLabel: string;
};

export interface TopSpendersLedgerProps {
  /** Rendered largest-draw first — the section sorts, so callers pass them in any order (same
   *  contract `BudgetPressure` already uses). */
  rows: TopSpenderRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  /** Shown over the still-rendered table headers when the estate genuinely drew nothing this
   *  period. */
  emptyMessage?: string;
  className?: string;
}
