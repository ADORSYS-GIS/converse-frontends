import type { ReviewDetailPanelProps } from '../../components/review-detail-panel';

export interface ReviewDetailRailProps {
  /** The selected request's detail, or `null`/`undefined` when nothing is selected. */
  detail?: ReviewDetailPanelProps | null;
  className?: string;
}
