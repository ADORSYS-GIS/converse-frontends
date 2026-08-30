import type { ReactNode } from 'react';

/** A column's sort direction. Ascending/descending only — there is no third "unsorted but
 *  pinned" state; a column stops being the active sort by another column's header being pressed. */
export type LedgerSortDirection = 'asc' | 'desc';

/** Which column is sorted, and which way. Owned entirely by the consumer (typically a URL param,
 *  ADR 0011) — `LedgerTable` only reads it to paint `aria-sort`/the caret and calls `onSortChange`
 *  when a sortable header is pressed; it never reorders `data` itself. */
export type LedgerSort = { key: string; direction: LedgerSortDirection };

export interface LedgerColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** CSS grid track for this column, e.g. `'160px'`. Defaults to an equal fluid fraction. */
  width?: string;
  /** Renders the header as a real `<button>` (accessible name = the column label) that calls
   *  `onSortChange` on press. A column with no `onSortChange` wired renders the same button but
   *  it is inert — see `LedgerTableProps.onSortChange`. */
  sortable?: boolean;
}

export interface LedgerTableProps<T> {
  columns: LedgerColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** 44px rows by default; 52px for review queues (Mercury). */
  density?: 'default' | 'review';
  selectedRowKeys?: string[];
  onSelectRow?: (row: T) => void;
  /** Trailing lifecycle actions, always visible — `subtle` at rest, strengthening to `ink` on row
   *  hover/focus-within (`console-table`'s own hook in theme.css). Typically a `<RowActionGroup />`. */
  renderRowActions?: (row: T) => ReactNode;
  /** Totals footer cells keyed by column key, rendered above a `--line` rule. */
  totals?: Partial<Record<string, ReactNode>>;
  /** The currently active sort, or `undefined` when the ledger has no sort applied. Purely for
   *  painting `aria-sort` and the caret — the consumer (URL state) owns the actual order of
   *  `data`. */
  sort?: LedgerSort;
  /** Fired with the NEXT sort state when a sortable header is pressed: the same column toggles
   *  direction, a different column starts at `asc`. The consumer decides what to do with it
   *  (typically writing a URL param) — this table never reorders `data` on its own. */
  onSortChange?: (sort: LedgerSort) => void;
  loading?: boolean;
  loadingRowCount?: number;
  className?: string;
}
