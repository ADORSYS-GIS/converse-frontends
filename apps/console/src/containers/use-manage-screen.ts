'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type {
  ManageFiltersRailProps,
  ManageReportRailProps,
  ManageTotals,
  ProjectRow,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useConsoleScopeContext } from '../client/console-scope-context';
import { useManageViewState } from '../client/view-state';
import { manageTotals, toProjectRows } from './project-rows';

/**
 * `/manage` — the screen's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/manage/page.tsx`).
 *
 * Both sides read the same view-state store, so the rail's FILTERS/SELECTION sections and the
 * centre's ledger cannot disagree; the identical `useList` key means one request, not two.
 */

const PAGE_SIZE = 25;

const STATUS_OPTIONS: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const BUDGET_STATE_OPTIONS = [
  { value: 'all', label: 'Any budget state' },
  { value: 'quota-set', label: 'Quota set' },
  { value: 'no-quota', label: 'No quota' },
];

const GROUP_BY_OPTIONS: SegmentedOption<string>[] = [
  { value: 'project', label: 'Project' },
  { value: 'model', label: 'Model' },
];

/**
 * ADR 0009 Decision 8's `/api/reports/consumption` CSV route is a separate follow-up (the ADR's
 * own follow-up list, item 6) and reads from the usage backend. Rather than ship a button that
 * silently does nothing, this states plainly why nothing happened, in the screen's own inline
 * error line.
 */
const REPORT_EXPORT_PENDING =
  'Report export needs the consumption report route (ADR 0009 Decision 8), which is not wired yet.';

const NEW_PROJECT_PENDING =
  'Project creation arrives with the project form (ADR 0009 follow-up 3).';

export interface ManageScreen {
  rows: ProjectRow[];
  loading: boolean;
  errorMessage: string | undefined;
  totals: ManageTotals;
  retry: () => void;
  search: string;
  setSearch: (value: string) => void;
  newProject: () => void;
  selectedProject: ProjectRow | null;
  selectRow: (row: ProjectRow) => void;
  projectCount: number;
  pagination: {
    shown: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  filters: ManageFiltersRailProps;
  report: ManageReportRailProps;
}

/**
 * `scopeSlot` is passed in rather than built here because `ReportExportPanel` renders it as-is and
 * the panel does not own account/project scope — a `ScopeSelect` does. Both callers pass the same
 * element.
 */
export function useManageScreen(scopeSlot: ReactNode): ManageScreen {
  const scope = useConsoleScopeContext();
  const [view, patchView] = useManageViewState();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.accountId) {
      active.push({ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId });
    }
    if (view.statusValue !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: view.statusValue });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.accountId, view.statusValue, view.search]);

  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'name', order: 'asc' }],
  });

  const projects = list.result.data;
  const total = list.result.total ?? projects.length;

  const rows = useMemo(() => {
    const mapped = toProjectRows(projects);
    if (view.budgetStateValue === 'quota-set') return mapped.filter((row) => row.ceiling !== null);
    if (view.budgetStateValue === 'no-quota') return mapped.filter((row) => row.ceiling === null);
    return mapped;
  }, [projects, view.budgetStateValue]);

  const refresh = () => {
    patchView({ notice: undefined });
    void list.query.refetch();
  };

  return {
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError ? 'Could not load projects.' : view.notice,
    totals: manageTotals(rows, total),
    retry: refresh,
    search: view.search,
    setSearch: (search) => patchView({ search, page: 1 }),
    newProject: () => patchView({ notice: NEW_PROJECT_PENDING }),
    selectedProject: view.selectedProject,
    selectRow: (selectedProject) => patchView({ selectedProject }),
    projectCount: total,
    pagination: {
      shown: rows.length,
      total,
      hasPrev: view.page > 1,
      hasNext: view.page * PAGE_SIZE < total,
      onPrev: () => patchView({ page: Math.max(1, view.page - 1) }),
      onNext: () => patchView({ page: view.page + 1 }),
    },
    filters: {
      accountValue: scope.value.accountId,
      accountOptions: scope.accounts.map((account) => ({
        value: account.id,
        label: account.label,
      })),
      onAccountChange: (accountId) => {
        scope.setValue({ accountId, projectId: null });
        patchView({ page: 1 });
      },
      statusOptions: STATUS_OPTIONS,
      statusValue: view.statusValue,
      onStatusChange: (statusValue) => patchView({ statusValue, page: 1 }),
      budgetStateValue: view.budgetStateValue,
      budgetStateOptions: BUDGET_STATE_OPTIONS,
      onBudgetStateChange: (budgetStateValue) => patchView({ budgetStateValue }),
    },
    report: {
      period: view.period,
      onPeriodChange: (period) => patchView({ period }),
      scopeSlot,
      groupByOptions: GROUP_BY_OPTIONS,
      groupBy: view.reportGroupBy,
      onGroupByChange: (reportGroupBy) => patchView({ reportGroupBy }),
      includeToggles: [
        { id: 'totals', label: 'Totals row', checked: view.includes.totals },
        { id: 'per-model', label: 'Per-model breakdown', checked: view.includes['per-model'] },
      ],
      onToggleInclude: (id, checked) =>
        patchView({ includes: { ...view.includes, [id]: checked } }),
      format: view.format,
      onFormatChange: (format) => patchView({ format }),
      onGenerate: () => patchView({ notice: REPORT_EXPORT_PENDING }),
      generating: false,
      lastExports: [],
    },
  };
}
