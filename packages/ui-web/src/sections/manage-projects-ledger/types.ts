import type { ReactNode } from 'react';

export type ProjectStatus = 'active' | 'near ceiling' | 'archived';

export type ProjectRow = {
  id: string;
  name: string;
  account: string;
  members: number;
  keys: number;
  /** `null` renders as an em dash — archived projects carry no spend figures. */
  spendMtd: number | null;
  ceiling: number | null;
  usedPercent: number | null;
  status: ProjectStatus;
  statusLabel: string;
};

export type ManagePagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export type ManageTotals = {
  shownLabel: string;
  spendMtd: number;
  ceiling: number;
  usedPercent: number;
};

export interface ManageProjectsLedgerProps {
  projects: ProjectRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  totals?: ManageTotals;

  search: string;
  onSearchChange: (value: string) => void;
  onNewProject: () => void;

  selectedRowKeys?: string[];
  onSelectRow: (row: ProjectRow) => void;

  pagination?: ManagePagination;

  /** Compact-tier trigger slot beside the search field — where the FILTERS trigger sits. */
  toolbarActions?: ReactNode;
  /**
   * Compact-tier trigger for MONTHLY REPORT. Rendered in its own `lg:hidden` labelled row below
   * the table's totals footer rather than in the title row (judgement call: the report summarises
   * exactly the aggregate figures shown in that footer, a tighter pairing than the page title).
   */
  reportTrigger?: ReactNode;
  className?: string;
}
