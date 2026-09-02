import type { LedgerSort } from '../../components/ledger-table';
import type { RefillRequester } from '../../lib/refill-requester';

export type RefillRequestRow = {
  id: string;
  submittedAgo: string;
  /** Resolved display names, never a raw id — `Project.name` / `accountScopeLabel(account)`,
   *  resolved by the container (`use-admin-screen.ts`) the same way Overview resolves its own
   *  project/account labels. `'—'` when a request carries no `projectId` at all. */
  project: string;
  account: string;
  /** Who asked (converse-frontends#444). Resolved by the container from ONE batched
   *  `resolveUserProfiles` call over the whole page's `requestedByUserId`s — see
   *  `lib/refill-requester.ts` for why this is a union rather than a nullable name. */
  requester: RefillRequester;
  requestedAmount: number;
};

export interface ReviewQueuePagination {
  shown: number;
  hasPrev: boolean;
  /** Reflects the real `nextCursor` the backend returned — never a fabricated `false`. */
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface ReviewQueueProps {
  pending: RefillRequestRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;

  /** The `Submitted` column's sort — the queue's only sortable column. Owned by the consumer
   *  (a URL param, ADR 0011); this section only paints the header and calls `onSortChange`. */
  sort?: LedgerSort;
  onSortChange?: (sort: LedgerSort) => void;

  selectedRequestId?: string | null;
  onSelectRequest: (row: RefillRequestRow) => void;

  /**
   * A degraded-but-not-broken note about requester resolution, rendered as an `InlineStatus`
   * ABOVE the table (converse-frontends#444): the queue's own rows load from
   * `listPendingAugmentationRequests`, the names from a separate `resolveUserProfiles` batch, and
   * the second failing must never take the first down with it. Omitted when resolution is fine —
   * a status line that is always present says nothing.
   */
  requesterStatus?: string;

  /** Omitted entirely when the source cannot page (or there is only one page) — never a caption
   *  claiming more rows exist with nothing to click. */
  pagination?: ReviewQueuePagination;

  className?: string;
}
