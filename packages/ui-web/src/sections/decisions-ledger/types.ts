import type { ReactNode } from 'react';

/**
 * `auto_approved` is kept distinct from `approved` — a policy-engine grant is not a human
 * decision, and `decidedBy` is always `—` for it. `unknown` covers any backend status this client
 * does not recognise; it is never defaulted to `declined` (converse-frontends#264).
 */
export type DecisionOutcome = 'approved' | 'auto_approved' | 'declined' | 'unknown';

export type DecisionRow = {
  id: string;
  date: string;
  project: string;
  account: string;
  amount: number;
  decision: DecisionOutcome;
  /** The backend's own status string — rendered verbatim when `decision` is `'unknown'`. */
  rawStatus?: string;
  decidedBy: string;
};

export type AdminReviewPagination = {
  shown: number;
  /** The true total, when a source genuinely reports one. Omit rather than guess. */
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  /** Only set when the source confirmed there is (or isn't) a further page — never a false default. */
  hasNext?: boolean;
};

export interface DecisionsLedgerProps {
  /** Uppercase tracked heading. Defaults to admin-budget-review.svg's own wording. */
  label?: string;
  decisions: DecisionRow[];
  pagination?: AdminReviewPagination;
  /**
   * An inline status line rendered above the ledger, for a known limitation in where `decisions`
   * came from (e.g. "no dedicated decided-request endpoint exists yet — this list may be
   * incomplete"). Omit when the source is a complete, dedicated listing.
   */
  sourceCaveat?: ReactNode;
  className?: string;
}
