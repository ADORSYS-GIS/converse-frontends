export interface SkeletonRowProps {
  /** Number of blocks to render when no explicit `gridTemplateColumns` alignment is needed. */
  columnCount?: number;
  /** CSS `grid-template-columns` value to align blocks with a real row's geometry (e.g. a
   * LedgerTable's column widths). Defaults to equal-width tracks for `columnCount`. */
  gridTemplateColumns?: string;
  /** Row height: 44px default (browse lists), 52px for review-queue density. */
  density?: 'default' | 'review';
  className?: string;
}
