import type { ReactNode } from 'react';

/**
 * `active | suspended` are the only values the backend's lifecycle state machine ever writes
 * (`authz.cstack` — `disableProject`/`enableProject`). `unknown` is not a third backend state: it
 * is what the row mapper renders when it receives a status value outside that pair, so a
 * client/backend drift shows up as a visibly unresolved value instead of silently becoming
 * `active`.
 */
export type ProjectStatus = 'active' | 'suspended' | 'unknown';

export type ProjectRow = {
  id: string;
  name: string;
  account: string;
  /** `null` renders as an em dash — spend has no live source yet (Epic 4). */
  spendMtd: number | null;
  /**
   * A governance tier id from an operator-configured catalog (e.g. `growth`), never a currency
   * amount — there is no numeric budget ceiling in this contract to coerce it into. `null` means
   * no tier is assigned and renders as an em dash.
   */
  quotaTier: string | null;
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
  /** `null` renders as an em dash — see `ProjectRow.spendMtd`. */
  spendMtd: number | null;
};

export interface ManageProjectsLedgerProps {
  projects: ProjectRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  totals?: ManageTotals;

  selectedRowKeys?: string[];
  onSelectRow: (row: ProjectRow) => void;

  pagination?: ManagePagination;

  className?: string;
}
