import React from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import { SortChevronIcon, SortNeutralIcon } from '../../lib/icons';
import { SKELETON_BLOCK_CLASS, SKELETON_BLOCK_WIDTHS } from '../../lib/skeleton-geometry';
import { ledgerRowVariants } from './cva';
import type { LedgerSort, LedgerTableProps } from './types';

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

/** The sort a click on `key`'s header produces, given the CURRENT sort. Pressing the already-
 *  active column's header toggles direction; pressing a different column starts it at `asc` —
 *  the same "click again to reverse" idiom every sortable table uses. Purely a UI-state
 *  transition (what the NEXT click's payload should be), not the data reordering itself, which
 *  stays the consumer's job (`LedgerTableProps.onSortChange`'s own doc comment). */
function nextSort(current: LedgerSort | undefined, key: string): LedgerSort {
  if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  return { key, direction: 'asc' };
}

/** `aria-sort` is only meaningful on a column that CAN be sorted: `'none'` tells an AT user "this
 *  column is sortable, and currently isn't the sort" — omitting the attribute entirely (rather
 *  than `'none'`) on a non-sortable column says the opposite, correctly, "there is nothing to
 *  ask about here." */
function ariaSortFor(
  sortable: boolean | undefined,
  columnKey: string,
  sort: LedgerSort | undefined
): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortable) return undefined;
  if (sort?.key !== columnKey) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

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
  rowHref,
  totals,
  sort,
  onSortChange,
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
      {/* `role="grid"` — only when rows are the control (`onSelectRow`): the `aria-selected` a
          selectable row already carries is valid only on a `row` descended from a grid/treegrid.
          A `<td>`'s implicit ARIA role adapts to `gridcell` from a `role="grid"` table ancestor
          per the HTML-ARIA mapping, so nothing else in this markup needs to change. */}
      <table className={cn(TABLE_CLASS, className)} role={onSelectRow ? 'grid' : undefined}>
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
                aria-sort={ariaSortFor(column.sortable, column.key, sort)}
                className={cn(LABEL_CLASS, column.align === 'right' && ALIGN_RIGHT_CLASS)}>
                {column.sortable ? (
                  <button
                    type="button"
                    // A data attribute, not a second class: `ledger-sort-button`'s own `theme.css`
                    // block reads it to flip `justify-content` for a right-aligned column, so the
                    // alignment axis costs no extra hand-written utility (class-budget.test.ts).
                    data-align={column.align === 'right' ? 'right' : undefined}
                    className="ledger-sort-button"
                    onClick={() => onSortChange?.(nextSort(sort, column.key))}>
                    {column.header}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'ledger-sort-caret',
                        sort?.key === column.key && 'ledger-sort-caret-active'
                      )}>
                      {sort?.key === column.key ? (
                        <SortChevronIcon direction={sort.direction} />
                      ) : (
                        <SortNeutralIcon />
                      )}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
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
                // `<div>` grid and cannot live inside a `<tbody>`, so what the two share is the
                // BLOCK rather than the row (the skeleton geometry module imported above),
                // deterministic widths and all, never randomised, so a run of rows stays stable
                // across renders. The row height comes from the same row density map the real
                // rows below use. `role="presentation" aria-hidden` is `SkeletonRow`'s own
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
                        className={SKELETON_BLOCK_CLASS}
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
                // Only the FIRST column becomes a link — it is the row's identity cell. A `$`
                // figure or a timestamp being a link says nothing about where it goes.
                const href = rowHref?.(row);

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
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        data-kind={column.kind === 'data' ? 'data' : undefined}
                        className={cn(column.align === 'right' && ALIGN_RIGHT_CLASS)}>
                        {columnIndex === 0 && href ? (
                          <a href={href} className="ledger-row-link">
                            {column.accessor(row)}
                          </a>
                        ) : (
                          column.accessor(row)
                        )}
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
                <td
                  key={column.key}
                  data-kind={column.kind === 'data' ? 'data' : undefined}
                  className={cn(column.align === 'right' && ALIGN_RIGHT_CLASS)}>
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
