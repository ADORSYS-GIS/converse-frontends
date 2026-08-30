import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import type { RefillRequestRow } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `AugmentationRequest` model to the admin review queue's rows.
 *
 * The backend carries money as **integer micros in a string** (`requestedAmountMicros`), which is
 * the only representation that survives a round trip without floating-point drift. Converting to
 * the major unit happens exactly once, here, and only for display.
 */

const MICROS_PER_UNIT = 1_000_000;

/**
 * `AugmentationRequest.status`'s real values (`authz.cstack:951-955,968-988` — a plain `String`,
 * not a schema enum; these are the Rust `AugmentationStatus::as_str` wire values). Pinned here as
 * the single source `isPending` compares against, so a future rename is caught by the regression
 * test on this constant rather than by a silently-empty pending queue in production
 * (converse-frontends#264).
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

/**
 * `projectLabel`/`accountLabel` are resolved by the caller (`use-refills-queue-screen.ts`, the same way
 * `use-overview-screen.ts` resolves its own scope labels from `useConsoleScope()`'s
 * `allProjects`/`allAccounts`) — this module has no data source of its own to resolve an id
 * against, and a raw `projectId`/`accountId` is never an acceptable label
 * (converse-frontends#270's correction to the Manage ledger applies here too).
 */
export function toRefillRequestRow(
  request: AugmentationRequest,
  now: number,
  projectLabel: string,
  accountLabel: string
): RefillRequestRow {
  return {
    id: request.id,
    submittedAgo: relativeAge(request.createdAt, now),
    project: projectLabel,
    account: accountLabel,
    requestedAmount: microsToAmount(request.requestedAmountMicros),
  };
}

/** True only for a request genuinely awaiting a decision (`authz.cstack:951-955`). */
export function isPending(request: AugmentationRequest): boolean {
  return request.status === AUGMENTATION_STATUS.PENDING_REVIEW;
}
