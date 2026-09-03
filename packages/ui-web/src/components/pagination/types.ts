export interface PaginationProps {
  /** Rows rendered on the current page. */
  shown: number;
  /** The total row count, when the source can report one — omit when it cannot ("12 keys"
   *  rather than "Showing 12 of ? keys"). */
  total?: number;
  /**
   * The page's own capacity, when the caller lets an operator choose it (`/admin/sessions`'
   * `?limit=`). Present, the caption reads "12 of 25 sessions per page" — the second number is
   * how many the page COULD hold, which is the only way "12" is readable as "this page is not
   * full" rather than "there are 12 in total". Absent, the caption is unchanged.
   *
   * Mutually exclusive with `total` in practice: a source that can report a real total says so
   * ("Showing 12 of 23 keys") and has no need to state its own page size. Passing both prefers
   * `total`, since a true total is the stronger fact.
   */
  pageSize?: number;
  /** The plural noun the counts describe — "keys", "projects", "requests". */
  unit: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}
