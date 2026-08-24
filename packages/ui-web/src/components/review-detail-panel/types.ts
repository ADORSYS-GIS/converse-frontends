export type ReviewHistoryRow = {
  id: string;
  label: string;
  amount: number;
  meta: string;
};

export type ReviewDecision = 'approve' | 'decline';

export type ReviewDetailPanelProps = {
  /** The project (or other subject) the refill request is for. */
  subject: string;
  requesterEmail: string;
  submittedAt: string;
  consumedAmount: number;
  ceilingAmount: number;
  /** 0–1 fraction; the meter fill turns `primary` at or past this threshold. Defaults to 0.9. */
  warningThreshold?: number;
  requestedAmount: number;
  requesterNote?: string;
  history: ReviewHistoryRow[];
  note: string;
  onNoteChange: (note: string) => void;
  onDecide: (decision: ReviewDecision, note: string) => void;
  /** True while a decision is being submitted — both actions disable. */
  deciding?: boolean;
  className?: string;
};
