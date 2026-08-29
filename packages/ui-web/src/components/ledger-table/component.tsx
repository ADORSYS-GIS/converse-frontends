import React from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import { SKELETON_BLOCK_WIDTHS } from '../skeleton-row/cva';
import { ledgerRowVariants } from './cva';
import type { LedgerTableProps } from './types';

const ACTIONS_TRACK = '136px';

// daisy `table` + `table-xs` (PRIMITIVES.md row `ledger-table`; `table-zebra` stays rejected —
// row separation is a `raised` hairline, never an alternating fill).
//
// This used to be a CSS-grid of `<div role="table"/"row"/"cell">`, which is why the daisy class
// swap had been impossible: `table`'s selectors are all `th`/`td`/`tr`-shaped, so a grid of divs
// wearing ARIA roles gets none of it. The columns API is unchanged — the per-column `width` now
// drives a `<colgroup>` instead of a grid track, and `align` still lands on the cell.
//
// Sizing notes, so the next reader does not "tidy" them away:
//  - `table-xs` pads cells `.25rem/.5rem`; two adjacent cells therefore reproduce the old grid's
//    16px gutter exactly, and `console-table` strips the outer 8px so the ledger still starts
//    flush with the floor's content edge.
//  - daisy sizes body rows at 11px (`table-xs`) and `thead` at 14px/600. Every correction to that
//    — and to daisy's hairline colour, its row hover, and the reveal-on-hover actions column —
//    is a descendant rule inside `console-table`, not a class on the element here. That is the
//    difference between this file and the version that adopted daisy `table` first: correcting
//    daisy at the call site pushed it from 52 hand-written utilities to 65, because each
//    disagreement bought its own arbitrary variant.
const TABLE_CLASS = 'table table-xs console-table';

// Numeric columns are right-aligned (console-ui skill "Type"); named once because four cells ask
// for the same thing and a repeated literal is four chances to disagree.
const ALIGN_RIGHT_CLASS = 'text-right';

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.2–5.3 — generic typed
// columns API (accessor + align + width); no sorting logic, that stays the consumer's job.
// Renders uncontained on the floor — panelling is the consumer's decision (console-ui skill).
export function LedgerTable<T>({
  columns,
  data,
  rowKey,
  density = 'default',
  selectedRowKeys,
  onSelectRow,
  renderRowActions,
  totals,
  loading = false,
  loadingRowCount = 6,
  className,
}: LedgerTableProps<T>) {
  const hasActions = Boolean(renderRowActions);
  const selected = new Set(selectedRowKeys ?? []);
  const columnCount = columns.length + (hasActions ? 1 : 0);

  // Contract: console-ui skill "No overflow, ever" — a ledger's fixed-width columns can exceed
  // the centre column's width at the base/md tiers; the container scrolls horizontally, the
  // page never does. The box itself is `ledger-scroll` (theme.css), which carries the reason
  // its two overflow axes differ.
  return (
    // `tabIndex={0}` alone (no `role="region"`) satisfies axe's scrollable-region-focusable rule
    // (a scrollable area must be reachable by keyboard) without adding a landmark: a page with
    // two or more `LedgerTable`s (e.g. Admin's pending queue + recent decisions) would otherwise
    // trip landmark-unique, since every instance shares the same generic label -- found during
    // the ADR 0010 phase 4 sweep.
    <div className="ledger-scroll" tabIndex={0}>
      <table className={cn(TABLE_CLASS, className)}>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
          {hasActions ? <col style={{ width: ACTIONS_TRACK }} /> : null}
        </colgroup>

        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(LABEL_CLASS, column.align === 'right' && ALIGN_RIGHT_CLASS)}>
                {column.header}
              </th>
            ))}
            {hasActions ? (
              <th scope="col" className={cn(LABEL_CLASS, ALIGN_RIGHT_CLASS)}>
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: loadingRowCount }, (_, index) => (
                // Loading rows reuse the real row's geometry so the skeleton matches the final
                // layout exactly (console-ui skill "States"). `SkeletonRow` itself is a
                // `<div>` grid and cannot live inside a `<tbody>`, so only its deterministic
                // block widths are shared — never randomised, so a run of rows stays stable
                // across renders. `role="presentation" aria-hidden` is `SkeletonRow`'s own
                // contract, kept verbatim: `pages-stories/loading-skeletons.test.tsx` asserts
                // every console `loading.tsx` renders exactly that pair, and it is also what
                // keeps `getAllByRole('row')` at "header only" while loading.
                <tr
                  key={index}
                  role="presentation"
                  aria-hidden="true"
                  className={ledgerRowVariants({ density, selectable: false })}>
                  {Array.from({ length: columnCount }, (_, cellIndex) => (
                    <td key={cellIndex}>
                      <span
                        className="skeleton block h-3"
                        style={{
                          width: SKELETON_BLOCK_WIDTHS[cellIndex % SKELETON_BLOCK_WIDTHS.length],
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);

                return (
                  <tr
                    key={key}
                    aria-selected={onSelectRow ? isSelected : undefined}
                    tabIndex={onSelectRow ? 0 : undefined}
                    onClick={onSelectRow ? () => onSelectRow(row) : undefined}
                    onKeyDown={
                      onSelectRow
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onSelectRow(row);
                            }
                          }
                        : undefined
                    }
                    className={ledgerRowVariants({ density, selectable: Boolean(onSelectRow) })}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(column.align === 'right' && ALIGN_RIGHT_CLASS)}>
                        {column.accessor(row)}
                      </td>
                    ))}
                    {hasActions ? (
                      // `row-actions` is `console-table`'s reveal-on-hover hook, not a paint class
                      // of its own.
                      <td className="row-actions">
                        {/* The flex box lives INSIDE the cell: a `display:flex` on the `<td>`
                            itself would take it out of the table box model and break column
                            alignment. */}
                        <div className="flex justify-end">{renderRowActions?.(row)}</div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
        </tbody>

        {totals ? (
          <tfoot>
            {/* The totals rule, padding and type are `console-table`'s `tfoot` branch — nothing
                per-instance to add. */}
            <tr>
              {columns.map((column) => (
                <td key={column.key} className={cn(column.align === 'right' && ALIGN_RIGHT_CLASS)}>
                  {totals[column.key]}
                </td>
              ))}
              {hasActions ? <td /> : null}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
