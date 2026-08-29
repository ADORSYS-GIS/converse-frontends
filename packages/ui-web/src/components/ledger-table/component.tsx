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
//    16px `gap-4` exactly, and `[&_tr>*:first-child]:pl-0` / `:last-child]:pr-0` strip the outer
//    8px so the ledger still starts flush with the floor's content edge.
//  - daisy sizes body rows at 11px (`table-xs`) and `thead` at 14px/600; both are inherited
//    values, so the explicit `text-xs` on `<td>` and `LABEL_CLASS` + `font-normal` on `<th>`
//    (declared values on the cell itself) win without needing `!`.
const TABLE_CLASS =
  'table table-xs console-table min-w-max border-t border-raised font-mono';

const HEAD_CELL_CLASS = cn(LABEL_CLASS, 'py-2 font-normal border-b border-raised');
const BODY_CELL_CLASS = 'text-soft text-xs';
// The totals rule is `console-table`'s `tfoot` branch — nothing per-instance to add.
const TOTALS_ROW_CLASS = '';

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
  // page never does. `min-w-max` keeps the table at its natural (unshrunk) width inside the
  // scrollable box rather than letting cells wrap to fit.
  return (
    // `overflow-y-clip` is load-bearing, NOT redundant: `overflow-x-auto` on its own computes
    // `overflow-y` to `auto` too, which makes this box a vertical scroll container and swallows
    // the wheel. `tabIndex={0}` alone (no `role="region"`) satisfies axe's
    // `scrollable-region-focusable` (a scrollable area must be reachable by keyboard) without
    // adding a landmark: a page with two or more `LedgerTable`s (e.g. Admin's pending queue +
    // recent decisions) would otherwise trip `landmark-unique`, since every instance shares the
    // same generic label -- found during the ADR 0010 phase 4 sweep.
    <div className="w-full overflow-x-auto overflow-y-clip" tabIndex={0}>
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
                className={cn(HEAD_CELL_CLASS, column.align === 'right' && 'text-right')}>
                {column.header}
              </th>
            ))}
            {hasActions ? (
              <th scope="col" className={cn(HEAD_CELL_CLASS, 'text-right')}>
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
                        className="bg-raised block h-3 rounded-[2px]"
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
                        className={cn(BODY_CELL_CLASS, column.align === 'right' && 'text-right')}>
                        {column.accessor(row)}
                      </td>
                    ))}
                    {hasActions ? (
                      <td className="opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100">
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
            <tr className={TOTALS_ROW_CLASS}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(BODY_CELL_CLASS, 'py-2', column.align === 'right' && 'text-right')}>
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
