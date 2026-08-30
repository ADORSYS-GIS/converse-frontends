import type { ReactNode } from 'react';

import type { LedgerSort } from '../../components/ledger-table';

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
  /** The owning account — no longer a ledger COLUMN (phase 5 revamp brief: dropped as redundant
   *  with the account scope every row is already filtered to), but still carried on the row for
   *  `DetailSheet`'s subtitle (`projects-centre.tsx`) and `ProjectDetail`. */
  account: string;
  /** `null` renders as an em dash — while the spend-by-project query is loading or has failed.
   *  Once it resolves, a project with no usage this period is a real `0`, never re-collapsed
   *  back to `null` — see `use-projects-screen.ts`'s `applyProjectSpend`. */
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

export type ProjectsPagination = {
  shown: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export interface ProjectsLedgerProps {
  projects: ProjectRow[];
  loading?: boolean;
  loadingRowCount?: number;
  error?: string;
  onRetry?: () => void;

  /** The table-scoped search box, leading the toolbar row. */
  search: string;
  onSearchChange: (value: string) => void;
  /** The account/status/budget-state filter cluster, trailing the toolbar row — composed by the
   *  caller (`ManageControls`) so this section stays generic about what a "filter" is. */
  filters?: ReactNode;

  /** Shown in place of the table when there are no rows at all AND no filter is narrowing the
   *  list — `EmptyState` with a `+ New project` CTA, never a bare "no rows" line. */
  emptyState?: ReactNode;
  /** Shown as an inline status line, table still rendered, when a filter/search narrowed the
   *  list down to zero rows — distinct from `emptyState` (console-ui skill "States": an empty
   *  RESULT reads differently from an empty COLLECTION). */
  filteredEmptyMessage?: ReactNode;

  sort?: LedgerSort;
  onSortChange?: (sort: LedgerSort) => void;

  selectedRowKeys?: string[];
  onSelectRow: (row: ProjectRow) => void;

  pagination?: ProjectsPagination;

  className?: string;
}
