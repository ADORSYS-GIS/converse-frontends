import type { RefillRequester } from '../../lib/refill-requester';

export type ReviewDecision = 'approve' | 'decline';

export type ReviewDetailPanelProps = {
  /**
   * Who asked (converse-frontends#444). REQUIRED, and deliberately not optional: a review panel
   * that can silently omit the requester is a panel a caller forgets to wire, and "we do not know
   * who asked" is itself one of the union's own branches (`lib/refill-requester.ts`) rather than
   * an absent prop. The `unresolved` branch is what puts the raw `requestedByUserId` in front of a
   * reviewer — the queue cell shows the same pair, this is where the id is legible enough to copy.
   */
  requester: RefillRequester;
  /** Resolved project display name — never a raw id. `'—'` when the request carries no
   *  `projectId` at all (`use-admin-screen.ts`). */
  projectLabel: string;
  /** Resolved account display label — `accountScopeLabel(account)`, never a raw UUID. */
  accountLabel: string;
  submittedAt: string;
  requestedAmount: number;
  /**
   * A note genuinely authored by the requester, when the backend actually supplies one. Today's
   * `AugmentationRequest` schema has no such field — a caller that has nowhere honest to source
   * this from should simply omit it, not repurpose the reviewer's own `rejectionReason`.
   */
  requesterNote?: string;
  /** The reviewer's own note/rationale on a past decision (e.g. `AugmentationRequest.rejectionReason`). */
  reviewerNote?: string;
  note: string;
  onNoteChange: (note: string) => void;
  onDecide: (decision: ReviewDecision, note: string) => void;
  /** True while a decision is being submitted — both actions disable. */
  deciding?: boolean;
  className?: string;
};
