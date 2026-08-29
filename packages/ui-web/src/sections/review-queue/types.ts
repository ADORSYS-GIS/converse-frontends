import type { ReactNode } from 'react';

export type RefillRequestRow = {
  id: string;
  submittedAgo: string;
  project: string;
  account: string;
  /** Null when no consumption query has been made for this request — render `—`, never `$0.00`. */
  consumed: number | null;
  /** Null alongside `consumed` — never backfilled with the requested amount. */
  ceiling: number | null;
  requestedAmount: number;
  requesterEmail: string;
};

export type AdminReviewTab = 'pending' | 'decided';

export interface ReviewQueueProps {
  activeTab: AdminReviewTab;
  onTabChange: (tab: AdminReviewTab) => void;
  pendingCount: number;
  decidedCount: number;

  pending: RefillRequestRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  /**
   * Shown above the queue when it is empty and not loading/erroring — README §6:
   * "Nothing awaiting a decision. N decided this month."
   */
  emptyPendingMessage?: ReactNode;

  selectedRequestId?: string | null;
  onSelectRequest: (row: RefillRequestRow) => void;
  className?: string;
}
