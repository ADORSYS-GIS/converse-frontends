import { useCallback, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

export type UsePaginationOptions = {
  /** Rows per page. Defaults to 10 (matches the backend list defaults). */
  pageSize?: number;
  /** 1-based page to start on. Defaults to 1. */
  initialPage?: number;
};

export type UsePaginationResult = {
  /** 1-based current page. */
  page: number;
  /** Zero-based row offset to pass to the list endpoint (`(page - 1) * pageSize`). */
  offset: number;
  /** Row count to pass to the list endpoint (equal to `pageSize`). */
  limit: number;
  pageSize: number;
  /** False on page 1, true otherwise. */
  canPrev: boolean;
  next: () => void;
  prev: () => void;
  /** Jump back to page 1 — call when the underlying list changes (e.g. project switch). */
  reset: () => void;
  /**
   * Heuristic "is there a next page". The list endpoints return a bare array with
   * no total-count, so a full page (`returnedCount === pageSize`) is treated as
   * "there may be more". On an exact multiple of `pageSize` the final Next lands on
   * an empty page — a known, accepted limitation until the backend exposes a total.
   */
  hasMore: (returnedCount: number) => boolean;
};

/**
 * Offset-based pagination state machine. Owns the current page and derives the
 * `offset`/`limit` a list hook feeds to the SDK; the caller derives `hasMore` from
 * the length of the page it got back.
 *
 * State is local to the component today. When the URL-backed `useQueryState` hook
 * (ticket #70) lands, this is the natural place to read/write `page` through the URL
 * so a page survives refresh and deep-linking.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(() => Math.max(1, options.initialPage ?? 1));

  const next = useCallback(() => setPage((current) => current + 1), []);
  const prev = useCallback(() => setPage((current) => Math.max(1, current - 1)), []);
  const reset = useCallback(() => setPage(1), []);
  const hasMore = useCallback(
    (returnedCount: number) => returnedCount >= pageSize,
    [pageSize],
  );

  return useMemo(
    () => ({
      page,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      pageSize,
      canPrev: page > 1,
      next,
      prev,
      reset,
      hasMore,
    }),
    [page, pageSize, next, prev, reset, hasMore],
  );
}
