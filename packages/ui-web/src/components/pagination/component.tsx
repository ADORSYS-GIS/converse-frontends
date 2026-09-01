import React from 'react';

import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { META_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { PaginationProps } from './types';

// The console visual revamp's pagination row (phase 1 foundation brief): a caption on the left
// ("Showing 12 of 23 keys") and Previous/Next on the right, composing the already-rebuilt
// `Button` rather than a second control treatment. Renders nothing at all when the caller has
// wired neither direction — a ledger with no more pages to reach has no pagination row, not a
// row of two disabled buttons.
export function Pagination({ shown, total, unit, hasPrev, hasNext, onPrev, onNext }: PaginationProps) {
  if (!onPrev && !onNext) return null;

  const caption = total != null ? `Showing ${shown} of ${total} ${unit}` : `${shown} ${unit}`;

  return (
    <div className="pagination-bar">
      <span className={META_CLASS}>{caption}</span>
      <div className={INLINE_ROW_CLASS}>
        <Button type="button" variant="ghost" size="sm" disabled={!hasPrev} onClick={onPrev}>
          ‹ Previous
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!hasNext} onClick={onNext}>
          Next ›
        </Button>
      </div>
    </div>
  );
}
