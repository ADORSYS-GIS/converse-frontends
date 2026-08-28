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
  /**
   * Null/undefined when no consumption query has been made for this request — the panel then
   * renders an honest "not available" line and no meter, rather than a fabricated $0.00 against
   * a 0% bar (converse-frontends#265).
   */
  consumedAmount?: number | null;
  /** Null/undefined alongside `consumedAmount`. Never backfilled with `requestedAmount`. */
  ceilingAmount?: number | null;
  /** 0–1 fraction; the meter fill turns `primary` at or past this threshold. Defaults to 0.9. */
  warningThreshold?: number;
  requestedAmount: number;
  /**
   * A note genuinely authored by the requester, when the backend actually supplies one. Today's
   * `AugmentationRequest` schema has no such field — a caller that has nowhere honest to source
   * this from should simply omit it, not repurpose the reviewer's own `rejectionReason`.
   */
  requesterNote?: string;
  /** The reviewer's own note/rationale on a past decision (e.g. `AugmentationRequest.rejectionReason`). */
  reviewerNote?: string;
  /**
   * Null/undefined when history has not been fetched — renders "History not loaded.", distinct
   * from an empty array, which means a fetch confirmed there is none (converse-frontends#266).
   */
  history?: ReviewHistoryRow[] | null;
  note: string;
  onNoteChange: (note: string) => void;
  onDecide: (decision: ReviewDecision, note: string) => void;
  /** True while a decision is being submitted — both actions disable. */
  deciding?: boolean;
  className?: string;
};
