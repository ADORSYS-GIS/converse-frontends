export interface PaginationProps {
  /** Rows rendered on the current page. */
  shown: number;
  /** The total row count, when the source can report one — omit when it cannot ("12 keys"
   *  rather than "Showing 12 of ? keys"). */
  total?: number;
  /** The plural noun the counts describe — "keys", "projects", "requests". */
  unit: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}
