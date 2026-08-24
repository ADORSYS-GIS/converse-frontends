import type { ReactNode } from 'react';

import type { ConsoleShellTier } from '../../components/console-shell';
import type { NavSpineProps } from '../../components/nav-spine';
import type { ReviewDetailPanelProps } from '../../components/review-detail-panel';
import type { SubNavProps } from '../../components/sub-nav';

export type RefillRequestRow = {
  id: string;
  submittedAgo: string;
  project: string;
  account: string;
  consumed: number;
  ceiling: number;
  requestedAmount: number;
  requesterEmail: string;
};

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

export type AdminReviewTab = 'pending' | 'decided';

export type AdminReviewPagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export interface AdminBudgetReviewPageProps {
  tier: ConsoleShellTier;
  header: ReactNode;
  nav: NavSpineProps;
  subNav: SubNavProps;

  activeTab: AdminReviewTab;
  onTabChange: (tab: AdminReviewTab) => void;
  pendingCount: number;
  decidedCount: number;

  pending: RefillRequestRow[];
  decisions: DecisionRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  /** Shown above the pending queue when it is empty and not loading/erroring — §6:
   * "Nothing awaiting a decision. N decided this month." */
  emptyPendingMessage?: ReactNode;

  selectedRequestId?: string | null;
  onSelectRequest: (row: RefillRequestRow) => void;
  /** The right-rail ReviewDetailPanel content for the selected request — `null`/`undefined`
   * when nothing is selected (the rail then shows an inline "select a request" hint). */
  reviewDetail?: ReviewDetailPanelProps | null;

  pagination?: AdminReviewPagination;

  className?: string;
}
