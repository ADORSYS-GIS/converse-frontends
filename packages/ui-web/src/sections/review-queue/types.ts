import type { LedgerSort } from '../../components/ledger-table';

export type RefillRequestRow = {
  id: string;
  submittedAgo: string;
  /** Resolved display names, never a raw id — `Project.name` / `accountScopeLabel(account)`,
   *  resolved by the container (`use-admin-screen.ts`) the same way Overview resolves its own
   *  project/account labels. `'—'` when a request carries no `projectId` at all. */
  project: string;
  account: string;
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

  /** Omitted entirely when the source cannot page (or there is only one page) — never a caption
   *  claiming more rows exist with nothing to click. */
  pagination?: ReviewQueuePagination;

  className?: string;
}
