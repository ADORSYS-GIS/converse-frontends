import React from 'react';

import { fillCopy, useCopy } from '../../lib/copy';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { META_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { PaginationProps } from './types';

// The console visual revamp's pagination row (phase 1 foundation brief): a caption on the left
// ("Showing 12 of 23 keys") and Previous/Next on the right, composing the already-rebuilt
// `Button` rather than a second control treatment. Renders nothing at all when the caller has
// wired neither direction — a ledger with no more pages to reach has no pagination row, not a
// row of two disabled buttons.
export function Pagination({
  shown,
  total,
  pageSize,
  unit,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: PaginationProps) {
  // The three captions and both direction labels come from the copy context (ADR 0017's ui-web
  // contract) — English by default, so Storybook and every non-console consumer are unchanged.
  const copy = useCopy();

  if (!onPrev && !onNext) return null;

  // Three captions, in descending order of how much they can honestly claim: a real total, then
  // the page's own capacity (`shown / pageSize`, for a cursor-paged source that cannot count),
  // then the bare count. A cursor pager never knows the total, so inventing one is not on the
  // list.
  const caption =
    total != null
      ? fillCopy(copy.paginationShowingOfTotal, { shown, total, unit })
      : pageSize != null
        ? fillCopy(copy.paginationPerPage, { shown, pageSize, unit })
        : fillCopy(copy.paginationCount, { shown, unit });

  return (
    <div className="pagination-bar">
      <span className={META_CLASS}>{caption}</span>
      <div className={INLINE_ROW_CLASS}>
        <Button type="button" variant="ghost" size="sm" disabled={!hasPrev} onClick={onPrev}>
          {`‹ ${copy.paginationPrevious}`}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!hasNext} onClick={onNext}>
          {`${copy.paginationNext} ›`}
        </Button>
      </div>
    </div>
  );
}
