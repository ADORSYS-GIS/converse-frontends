import React from 'react';

import { cn } from '../../cn';
import type { PaginationProps } from './types';

// Gap-list item (LCI design pass, `docs/design/lci-app/PRIMITIVES.md`): a range label + prev/
// page/next control. Controlled — the caller owns the page index (URL-first state, ADR 0011),
// so this component never reads or writes a URL param itself. Uses daisy `join` to group the
// three controls into one visual unit; unlike `RowActionGroup` (deliberately *not* `join` —
// diagonal hairlines, no shared border to merge), a prev/current/next trio is exactly the
// "adjacent buttons collapse into one strip" case `join` is for.
export function Pagination({
  current,
  pageCount,
  rangeLabel,
  onPageChange,
  className,
}: PaginationProps) {
  const atStart = current <= 0;
  const atEnd = current >= pageCount - 1;

  return (
    <div className={cn('flex items-center gap-3 font-mono text-xs', className)}>
      <span className="text-subtle">{rangeLabel}</span>
      <div className="join">
        <button
          type="button"
          className="btn btn-xs join-item"
          disabled={atStart}
          onClick={() => onPageChange(current - 1 || null)}>
          Prev
        </button>
        <span className="btn btn-xs join-item text-soft pointer-events-none tabular-nums">
          {current + 1} / {pageCount}
        </span>
        <button
          type="button"
          className="btn btn-xs join-item"
          disabled={atEnd}
          onClick={() => onPageChange(current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
