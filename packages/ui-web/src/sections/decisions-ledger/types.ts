export type DecisionOutcome = 'approved' | 'declined';

export type DecisionRow = {
  id: string;
  date: string;
  project: string;
  account: string;
  amount: number;
  decision: DecisionOutcome;
  decidedBy: string;
};

export type AdminReviewPagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export interface DecisionsLedgerProps {
  /** Uppercase tracked heading. Defaults to admin-budget-review.svg's own wording. */
  label?: string;
  decisions: DecisionRow[];
  pagination?: AdminReviewPagination;
  className?: string;
}
