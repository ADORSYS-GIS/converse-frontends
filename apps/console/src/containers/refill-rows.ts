import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import type { DecisionRow, RefillRequestRow } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `AugmentationRequest` model to the admin review page's rows.
 *
 * The backend carries money as **integer micros in a string** (`requestedAmountMicros`), which is
 * the only representation that survives a round trip without floating-point drift. Converting to
 * the major unit happens exactly once, here, and only for display.
 */

const MICROS_PER_UNIT = 1_000_000;

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
    // Consumption and the ceiling come from the budget balance, not from the request itself; the
    // review panel fetches them per selection rather than guessing here.
    consumed: 0,
    ceiling: 0,
    requestedAmount: microsToAmount(request.requestedAmountMicros),
    requesterEmail: request.accountId,
  };
}

export function toDecisionRow(request: AugmentationRequest): DecisionRow {
  const approved = request.status === 'approved' || request.approvedAmountMicros !== null;
  return {
    id: request.id,
    date: request.createdAt.slice(0, 10),
    project: request.projectId ?? '—',
    account: request.accountId,
    amount: microsToAmount(request.approvedAmountMicros ?? request.requestedAmountMicros),
    decision: approved ? 'approved' : 'declined',
    decidedBy: request.reviewedBy ?? '—',
  };
}

export function isPending(request: AugmentationRequest): boolean {
  return request.status === 'pending';
}
