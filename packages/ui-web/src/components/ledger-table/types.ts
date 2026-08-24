import type { ReactNode } from 'react';

export interface LedgerColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** CSS grid track for this column, e.g. `'160px'`. Defaults to an equal fluid fraction. */
  width?: string;
}

export interface LedgerTableProps<T> {
  columns: LedgerColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** 44px rows by default; 52px for review queues (Mercury). */
  density?: 'default' | 'review';
  selectedRowKeys?: string[];
  onSelectRow?: (row: T) => void;
  /** Trailing lifecycle actions revealed on row hover/focus — typically a `<RowActionGroup />`. */
  renderRowActions?: (row: T) => ReactNode;
  /** Totals footer cells keyed by column key, rendered above a `--line` rule. */
  totals?: Partial<Record<string, ReactNode>>;
  loading?: boolean;
  loadingRowCount?: number;
  className?: string;
}
