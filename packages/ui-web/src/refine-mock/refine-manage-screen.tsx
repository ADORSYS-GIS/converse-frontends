// Refine-driven container for `ManagePage` — console-ui skill "Refine-driven mock screens":
// `useTable` over the `projects` resource, adapted into `ManagePageProps` exactly the way
// `apps/console` will once it swaps this mock data provider for `@cratestack/refine`'s generated
// one (docs/adr/0009-nextjs-console-replacement.md Decision 4). `ManagePage` itself stays pure —
// this container only translates hook state (`isLoading` → skeleton props, `isError` → error
// props, `result.data` → rows) into its props.

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useTable } from '@refinedev/core';

import type { ConsoleShellTier } from '../components/console-shell';
import type { LastExportEntry, ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { fieldControlVariants, fieldLabelClassName } from '../components/field/cva';
import {
  manageAccountOptions,
  manageAdminNavItems,
  manageBudgetStateOptions,
  manageLastExports,
  manageNavItems,
  manageStatusOptions,
  manageSubNavItems,
} from '../pages/manage/fixtures';
import { ManagePage } from '../pages/manage';
import type { ProjectRow } from '../pages/manage/types';
import { refineMockHeader } from './shared-chrome';

const nav = { items: manageNavItems, adminItems: manageAdminNavItems, showAdmin: false };

function buildFilters({
  search,
  accountValue,
  statusValue,
  budgetStateValue,
}: {
  search: string;
  accountValue: string;
  statusValue: string;
  budgetStateValue: string;
}): CrudFilter[] {
  const filters: CrudFilter[] = [];
  if (search.trim()) filters.push({ field: 'name', operator: 'contains', value: search.trim() });
  if (accountValue !== 'all') filters.push({ field: 'account', operator: 'eq', value: accountValue });
  if (statusValue !== 'all') filters.push({ field: 'status', operator: 'eq', value: statusValue });
  if (budgetStateValue === 'near-ceiling') filters.push({ field: 'status', operator: 'eq', value: 'near ceiling' });
  return filters;
}

export interface RefineManageScreenProps {
  tier?: ConsoleShellTier;
}

/** Live-wired `ManagePage`: `useTable` drives the ledger, pagination and server-side filters;
 * row selection retargets the right-rail SELECTION panel exactly like the fixture-driven story. */
export function RefineManageScreen({ tier = 'full' }: RefineManageScreenProps) {
  const [search, setSearch] = useState('');
  const [accountValue, setAccountValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('any');
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'per-model', label: 'Per-model breakdown', checked: true },
    { id: 'zero-usage', label: 'Include zero-usage projects', checked: false },
  ]);
  const [lastExports, setLastExports] = useState<LastExportEntry[]>(manageLastExports);
  const [generating, setGenerating] = useState(false);

  const filters = useMemo(
    () => buildFilters({ search, accountValue, statusValue, budgetStateValue }),
    [search, accountValue, statusValue, budgetStateValue],
  );

  const table = useTable<ProjectRow>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 12 },
  });

  // Re-derive `useTable`'s server-side filters whenever a control changes — the same
  // controlled-filter-UI wiring a real refine consumer uses (`setFilters(next, 'replace')`).
  React.useEffect(() => {
    table.setFilters(filters, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const rows = table.result.data;
  const loading = table.tableQuery.isLoading;
  const error = table.tableQuery.isError ? table.tableQuery.error?.message : undefined;

  const totals = rows.length > 0
    ? {
        shownLabel: `TOTAL · ${rows.length} SHOWN`,
        spendMtd: rows.reduce((sum, row) => sum + (row.spendMtd ?? 0), 0),
        ceiling: rows.reduce((sum, row) => sum + (row.ceiling ?? 0), 0),
        usedPercent:
          rows.length === 0
            ? 0
            : rows.reduce((sum, row) => sum + (row.usedPercent ?? 0), 0) / rows.length,
      }
    : undefined;

  const scopeSlot = (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClassName}>Scope</span>
      <select value="account:adorsys-gis" onChange={() => {}} className={fieldControlVariants({ error: false, multiline: false })}>
        <option value="account:adorsys-gis">Account · adorsys-gis</option>
      </select>
    </div>
  );

  return (
    <ManagePage
      tier={tier}
      header={refineMockHeader}
      nav={nav}
      subNav={{ items: manageSubNavItems }}
      projects={rows}
      loading={loading}
      error={error}
      onRetry={() => table.tableQuery.refetch()}
      totals={totals}
      search={search}
      onSearchChange={setSearch}
      onNewProject={() => {}}
      selectedRowKeys={selected ? [selected.id] : []}
      onSelectRow={setSelected}
      selectedProject={selected}
      pagination={{
        shown: rows.length,
        total: table.result.total ?? rows.length,
        hasPrev: table.currentPage > 1,
        hasNext: table.currentPage < table.pageCount,
        onPrev: () => table.setCurrentPage((page) => Math.max(1, page - 1)),
        onNext: () => table.setCurrentPage((page) => Math.min(table.pageCount, page + 1)),
      }}
      reportExport={{
        period,
        onPeriodChange: setPeriod,
        scopeSlot,
        groupByOptions: [
          { value: 'project-model', label: 'Project × Model' },
          { value: 'project', label: 'Project' },
          { value: 'model', label: 'Model' },
        ],
        groupBy,
        onGroupByChange: setGroupBy,
        includeToggles,
        onToggleInclude: (id, checked) =>
          setIncludeToggles((prev) => prev.map((toggle) => (toggle.id === id ? { ...toggle, checked } : toggle))),
        format,
        onFormatChange: setFormat,
        generating,
        lastExports,
        onGenerate: (params) => {
          setGenerating(true);
          setTimeout(() => {
            setGenerating(false);
            setLastExports((prev) => [{ filename: `${params.period} · ${params.format.toUpperCase()}`, date: 'just now' }, ...prev]);
          }, 400);
        },
      }}
      filters={{
        accountValue,
        accountOptions: manageAccountOptions,
        onAccountChange: setAccountValue,
        statusOptions: manageStatusOptions,
        statusValue,
        onStatusChange: setStatusValue,
        budgetStateValue,
        budgetStateOptions: manageBudgetStateOptions,
        onBudgetStateChange: setBudgetStateValue,
      }}
    />
  );
}
