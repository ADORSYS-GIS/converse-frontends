import type { ReactNode } from 'react';

import type { ConsoleShellTier } from '../../components/console-shell';
import type { NavSpineProps } from '../../components/nav-spine';
import type { ReportExportPanelProps } from '../../components/report-export-panel';
import type { SegmentedOption } from '../../components/segmented-control';
import type { SubNavProps } from '../../components/sub-nav';

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

export type ManageOption = { value: string; label: string };

export type ManageFilters = {
  accountValue: string;
  accountOptions: ManageOption[];
  onAccountChange: (value: string) => void;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  budgetStateValue: string;
  budgetStateOptions: ManageOption[];
  onBudgetStateChange: (value: string) => void;
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

export interface ManagePageProps {
  tier: ConsoleShellTier;
  header: ReactNode;
  nav: NavSpineProps;
  subNav: SubNavProps;

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
  /** The row the right-rail SELECTION panel currently targets — `null` shows "No rows selected." */
  selectedProject: ProjectRow | null;

  pagination?: ManagePagination;

  // right rail
  reportExport: ReportExportPanelProps;
  filters: ManageFilters;

  className?: string;
}
