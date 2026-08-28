import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import type { DecisionOutcome, DecisionRow, RefillRequestRow } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `AugmentationRequest` model to the admin review page's rows.
 *
 * The backend carries money as **integer micros in a string** (`requestedAmountMicros`), which is
 * the only representation that survives a round trip without floating-point drift. Converting to
 * the major unit happens exactly once, here, and only for display.
 */

const MICROS_PER_UNIT = 1_000_000;

/**
 * `AugmentationRequest.status`'s real values (`authz.cstack:951-955,968-988` — a plain `String`,
 * not a schema enum; these are the Rust `AugmentationStatus::as_str` wire values). Pinned here as
 * the single source both `isPending` and `toDecisionRow` compare against, so a future rename is
 * caught by the regression test on this constant rather than by a silently-empty pending queue in
 * production (converse-frontends#264).
 *
 * `'pending'` — the literal this module used to compare against — is not, and has never been, one
 * of these four values.
 */
export const AUGMENTATION_STATUS = {
  PENDING_REVIEW: 'pending_review',
  AUTO_APPROVED: 'auto_approved',
  APPROVED: 'approved',
  DENIED: 'denied',
} as const;

export function microsToAmount(micros: string | null | undefined): number {
  if (!micros) return 0;
  const parsed = Number(micros);
  if (!Number.isFinite(parsed)) return 0;
  return parsed / MICROS_PER_UNIT;
}

/** "2 days ago"-style relative phrasing, in whole units, without pulling in a date library. */
export function relativeAge(iso: string, now: number): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return 'unknown';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function toRefillRequestRow(request: AugmentationRequest, now: number): RefillRequestRow {
  return {
    id: request.id,
    submittedAgo: relativeAge(request.createdAt, now),
    project: request.projectId ?? '—',
    account: request.accountId,
    // Consumption and the ceiling would come from a budget-balance query this container does not
    // perform (no such query is wired up — Epic 4). `null` renders as an honest "—" in the queue
    // table rather than a fabricated $0.00 of $0.00 (converse-frontends#265).
    consumed: null,
    ceiling: null,
    requestedAmount: microsToAmount(request.requestedAmountMicros),
    requesterEmail: request.accountId,
  };
}

/**
 * Maps the backend's real status string to the row's decision label. `auto_approved` is kept
 * distinct from `approved` rather than folded together — an admin should not be told a human
 * reviewed something the policy engine approved on its own. Anything else (a status this client
 * does not recognise) falls back to `'unknown'` rather than defaulting to `'declined'`, which is
 * exactly the fabrication this function used to commit for every `pending_review` request.
 */
function decisionOutcome(status: string): DecisionOutcome {
  switch (status) {
    case AUGMENTATION_STATUS.APPROVED:
      return 'approved';
    case AUGMENTATION_STATUS.AUTO_APPROVED:
      return 'auto_approved';
    case AUGMENTATION_STATUS.DENIED:
      return 'declined';
    default:
      return 'unknown';
  }
}

export function toDecisionRow(request: AugmentationRequest): DecisionRow {
  return {
    id: request.id,
    date: request.createdAt.slice(0, 10),
    project: request.projectId ?? '—',
    account: request.accountId,
    amount: microsToAmount(request.approvedAmountMicros ?? request.requestedAmountMicros),
    decision: decisionOutcome(request.status),
    rawStatus: request.status,
    decidedBy: request.reviewedBy ?? '—',
  };
}

/** True only for a request genuinely awaiting a decision (`authz.cstack:951-955`). */
export function isPending(request: AugmentationRequest): boolean {
  return request.status === AUGMENTATION_STATUS.PENDING_REVIEW;
}
