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
  /**
   * Which type role the CELL renders in (phase 9 consistency pass — supersedes the table's old
   * mono-everywhere body font). `'text'` (default) — a name, a status word, a tier id: sans, like
   * every other UI string. `'data'` — a displayed data value: currency, a count, an id, a key
   * prefix, a date/timestamp: mono, tabular. Lands as `data-kind="data"` on the `<td>`/`<tfoot>`
   * cell (`component.tsx`), which `console-table`'s own `theme.css` block reads — the same
   * attribute-not-a-second-class idiom `column.align`'s `data-align` already uses on the sort
   * button, so this costs no extra hand-written utility (`class-budget.test.ts`).
   */
  kind?: 'text' | 'data';
}

export interface LedgerTableProps<T> {
  columns: LedgerColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** 44px rows by default; 52px for review queues (Mercury). */
  density?: 'default' | 'review';
  /**
   * Turns the LABEL cell — the first column — into a real `<a href>` (converse-frontends#446,
   * decision D-D: the top-spenders ledger's rows become navigable). Return `undefined` for a row
   * that has no destination; that row's label renders exactly as it does today.
   *
   * It is deliberately the CELL and not the row:
   *  - an `<a>` cannot wrap a `<tr>` and stay valid table markup, and
   *  - a whole-row link would swallow the row-actions column, so pressing an action would
   *    navigate instead of acting. The AC ("a row action does not trigger navigation") is
   *    satisfied structurally by the anchor never containing the action buttons, not by an
   *    `event.stopPropagation()` that a future action could forget.
   *
   * Because it is a real anchor, ⌘-click / middle-click / "open in new tab" and keyboard
   * activation all work — none of which a router `onClick` push provides. It composes with
   * `onSelectRow` (clicking elsewhere in the row still opens the detail sheet) and with
   * `renderRowActions`.
   */
  rowHref?: (row: T) => string | undefined;
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
