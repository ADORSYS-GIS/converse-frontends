import React from 'react';

import { cn } from '../../cn';
import { SkeletonRow } from '../skeleton-row';
import { ledgerRowVariants } from './cva';
import type { LedgerColumn, LedgerTableProps } from './types';

const ACTIONS_TRACK = '136px';

function buildGridTemplate<T>(columns: LedgerColumn<T>[], hasActions: boolean): string {
  const tracks = columns.map((column) => column.width ?? 'minmax(0, 1fr)');
  if (hasActions) {
    tracks.push(ACTIONS_TRACK);
  }
  return tracks.join(' ');
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
  totals,
  loading = false,
  loadingRowCount = 6,
  className,
}: LedgerTableProps<T>) {
  const hasActions = Boolean(renderRowActions);
  const gridTemplateColumns = buildGridTemplate(columns, hasActions);
  const selected = new Set(selectedRowKeys ?? []);

  // Contract: console-ui skill "No overflow, ever" — a ledger's fixed-width columns can exceed
  // the centre column's width at the base/md tiers; the container scrolls horizontally, the
  // page never does. `min-w-max` lets the grid keep its natural (unshrunk) column widths inside
  // the scrollable box instead of the grid tracks being squeezed to fit.
  return (
    // `tabIndex={0}` alone (no `role="region"`) satisfies axe's `scrollable-region-focusable`
    // (a scrollable area must be reachable by keyboard) without adding a landmark: a page with
    // two or more `LedgerTable`s (e.g. Admin's pending queue + recent decisions) would otherwise
    // trip `landmark-unique`, since every instance shares the same generic label -- found during
    // the ADR 0010 phase 4 sweep.
    <div className="w-full overflow-x-auto" tabIndex={0}>
      <div
        role="table"
        className={cn('border-raised min-w-max border-t font-mono text-xs', className)}>
        <div
          role="row"
          style={{ gridTemplateColumns }}
          className="border-raised grid items-center gap-4 border-b py-2">
          {columns.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              className={cn(
                'text-subtle text-[10px] tracking-[.09em] uppercase',
                column.align === 'right' && 'text-right'
              )}>
              {column.header}
            </div>
          ))}
          {hasActions ? (
            <div role="columnheader" className="sr-only">
              Actions
            </div>
          ) : null}
        </div>

        <div role="rowgroup">
          {loading
            ? Array.from({ length: loadingRowCount }, (_, index) => (
                <SkeletonRow
                  key={index}
                  gridTemplateColumns={gridTemplateColumns}
                  columnCount={columns.length + (hasActions ? 1 : 0)}
                  density={density}
                />
              ))
            : data.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);

                return (
                  <div
                    key={key}
                    role="row"
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
                    style={{ gridTemplateColumns }}
                    className={ledgerRowVariants({ density, selectable: Boolean(onSelectRow) })}>
                    {columns.map((column) => (
                      <div
                        key={column.key}
                        role="cell"
                        className={cn('text-soft', column.align === 'right' && 'text-right')}>
                        {column.accessor(row)}
                      </div>
                    ))}
                    {hasActions ? (
                      <div
                        role="cell"
                        className="flex justify-end opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100">
                        {renderRowActions?.(row)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
        </div>

        {totals ? (
          <div
            role="row"
            style={{ gridTemplateColumns }}
            className="border-border grid items-center gap-4 border-b py-2">
            {columns.map((column) => (
              <div
                key={column.key}
                role="cell"
                className={cn('text-soft', column.align === 'right' && 'text-right')}>
                {totals[column.key]}
              </div>
            ))}
            {hasActions ? <div role="cell" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
