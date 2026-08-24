'use client';

import type { Project } from '@lightbridge/authz-rpc';
import {
  ManagePage,
  ScopeSelect,
  type ManageOption,
  type ProjectRow,
  type ReportExportFormat,
  type SegmentedOption,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

import { ConsoleHeaderBar, adminNavItems, navItems } from '../client/console-chrome';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useShellTier } from '../client/use-shell-tier';
import { manageTotals, toProjectRows } from './project-rows';

/**
 * `/manage` — the `ManagePage` view driven by refine over the generated `projects` resource.
 */

const PAGE_SIZE = 25;

const STATUS_OPTIONS: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const BUDGET_STATE_OPTIONS: ManageOption[] = [
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
 * silently does nothing, this states plainly why nothing happened, in the page's own inline error
 * line.
 */
const REPORT_EXPORT_PENDING =
  'Report export needs the consumption report route (ADR 0009 Decision 8), which is not wired yet.';

export function ManageContainer() {
  const tier = useShellTier();
  const session = useConsoleSession();
  const scope = useConsoleScope();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [notice, setNotice] = useState<string | undefined>();

  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [groupBy, setGroupBy] = useState('project');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [includes, setIncludes] = useState<Record<string, boolean>>({
    totals: true,
    'per-model': false,
  });

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.accountId) {
      active.push({ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId });
    }
    if (statusValue !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: statusValue });
    }
    if (search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: search.trim() });
    }
    return active;
  }, [scope.value.accountId, statusValue, search]);

  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'name', order: 'asc' }],
  });

  const projects = list.result.data;
  const total = list.result.total ?? projects.length;

  const rows = useMemo(() => {
    const mapped = toProjectRows(projects);
    if (budgetStateValue === 'quota-set') return mapped.filter((row) => row.ceiling !== null);
    if (budgetStateValue === 'no-quota') return mapped.filter((row) => row.ceiling === null);
    return mapped;
  }, [projects, budgetStateValue]);

  const refresh = () => {
    setNotice(undefined);
    void list.query.refetch();
  };

  return (
    <ManagePage
      tier={tier}
      header={<ConsoleHeaderBar />}
      nav={{
        items: navItems('manage'),
        adminItems: adminNavItems('manage'),
        showAdmin: session.isAdmin,
      }}
      subNav={{
        items: [{ key: 'projects', label: 'Projects', count: total, active: true }],
      }}
      projects={rows}
      loading={list.query.isLoading}
      loadingRowCount={8}
      error={list.query.isError ? 'Could not load projects.' : notice}
      onRetry={refresh}
      emptyMessage="No projects in this account yet."
      totals={manageTotals(rows, total)}
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onNewProject={() =>
        setNotice('Project creation arrives with the project form (ADR 0009 follow-up 3).')
      }
      selectedRowKeys={selectedProject ? [selectedProject.id] : []}
      onSelectRow={(row) => setSelectedProject(row)}
      selectedProject={selectedProject}
      pagination={{
        shown: rows.length,
        total,
        hasPrev: page > 1,
        hasNext: page * PAGE_SIZE < total,
        onPrev: () => setPage((current) => Math.max(1, current - 1)),
        onNext: () => setPage((current) => current + 1),
      }}
      reportExport={{
        period,
        onPeriodChange: setPeriod,
        scopeSlot: (
          <ScopeSelect
            accounts={scope.accounts}
            projects={scope.projects}
            value={scope.value}
            onChange={(value) => {
              scope.setValue(value);
              setPage(1);
            }}
          />
        ),
        groupByOptions: GROUP_BY_OPTIONS,
        groupBy,
        onGroupByChange: setGroupBy,
        includeToggles: [
          { id: 'totals', label: 'Totals row', checked: includes.totals },
          { id: 'per-model', label: 'Per-model breakdown', checked: includes['per-model'] },
        ],
        onToggleInclude: (id, checked) => setIncludes((current) => ({ ...current, [id]: checked })),
        format,
        onFormatChange: setFormat,
        onGenerate: () => setNotice(REPORT_EXPORT_PENDING),
        generating: false,
        lastExports: [],
      }}
      filters={{
        accountValue: scope.value.accountId,
        accountOptions: scope.accounts.map((account) => ({
          value: account.id,
          label: account.label,
        })),
        onAccountChange: (value) => {
          scope.setValue({ accountId: value, projectId: null });
          setPage(1);
        },
        statusOptions: STATUS_OPTIONS,
        statusValue,
        onStatusChange: (value) => {
          setStatusValue(value);
          setPage(1);
        },
        budgetStateValue,
        budgetStateOptions: BUDGET_STATE_OPTIONS,
        onBudgetStateChange: setBudgetStateValue,
      }}
    />
  );
}
