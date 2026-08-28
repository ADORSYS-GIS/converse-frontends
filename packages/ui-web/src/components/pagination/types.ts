export type PaginationProps = {
  /** Zero-based current page index. */
  current: number;
  pageCount: number;
  /** e.g. "1–20 of 214" — the caller composes it; this component only lays it out. */
  rangeLabel: string;
  /**
   * Called with the next zero-based page index, or `null` when the caller should clear the page
   * param entirely (the URL-first convention — going back to page 0 yields a clean URL rather
   * than `?page=0`). Pass `current - 1 || null` for "prev" so the first page clears the param.
   */
  onPageChange: (page: number | null) => void;
  className?: string;
};
