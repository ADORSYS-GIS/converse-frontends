// Refine-driven container for the PROJECTS screen (renamed from Manage, 2026-08-30 revamp brief)
// — console-ui skill "Refine-driven mock screens": `useTable` over the `projects` resource,
// adapted into the Projects sections' props exactly the way `apps/console` does once it swaps this
// mock data provider for `@cratestack/refine`'s generated one (docs/adr/0009-nextjs-console-
// replacement.md Decision 4). The sections stay pure — this container only translates hook state
// (`isLoading` → skeleton props, `isError` → error props, `result.data` → rows) into their props.
//
// Shell revamp phase 3 (right rail out): MONTHLY REPORT/SELECTION no longer render inside a
// right-hand aside — MONTHLY REPORT is a `PageHeader.action` button that opens
// `ReportExportDialog`, and SELECTION is a `DetailSheet` hosting `ProjectDetail`, exactly matching
// `apps/console`'s own `projects-centre.tsx`. FILTERS (`ManageControls`, status/budget only) moved
// again in the 2026-08-30 revamp: off `PageHeader.controls` and into `ProjectsLedger`'s own
// toolbar, alongside the search field it now owns directly. `ManageControls`'s Account select is
// gone too (live findings #6, 2026-08-30) — it duplicated the sidebar workspace switcher
// (`scopeSlot` below), which owns account scope exclusively now.

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useTable } from '@refinedev/core';

import { Button } from '../components/button';
import { Card } from '../components/card';
import type { CreateProjectPlanOption } from '../components/create-project-dialog';
import { CreateProjectDialog } from '../components/create-project-dialog';
import { BottomSheet } from '../components/bottom-sheet';
import { EmptyState } from '../components/empty-state';
import { fieldControlClassName, fieldLabelClassName } from '../components/field/field-classes';
import type { LedgerSort } from '../components/ledger-table';
import { ReportExportDialog } from '../components/report-export-dialog';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { ManageControls } from '../sections/manage-controls';
import {
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-controls/fixtures';
import { ProjectsLedger } from '../sections/projects-ledger';
import type { ProjectRow } from '../sections/projects-ledger';
import { PageHeader } from '../sections/page-header';
import { ProjectDetail } from '../sections/project-detail';
import { RefineMockShell } from './shared-chrome';

function buildFilters({
  search,
  statusValue,
  budgetStateValue,
}: {
  search: string;
  statusValue: string;
  budgetStateValue: string;
}): CrudFilter[] {
  const filters: CrudFilter[] = [];
  if (search.trim()) filters.push({ field: 'name', operator: 'contains', value: search.trim() });
  if (statusValue !== 'all') filters.push({ field: 'status', operator: 'eq', value: statusValue });
  // Real signal, not a numeric-ceiling coercion (issue #269): whether a governance quota tier is
  // assigned at all.
  if (budgetStateValue === 'quota-set')
    filters.push({ field: 'quotaTier', operator: 'ne', value: null });
  if (budgetStateValue === 'no-quota')
    filters.push({ field: 'quotaTier', operator: 'eq', value: null });
  return filters;
}

/** Live-wired Projects screen: `useTable` drives the ledger, pagination, sort and server-side
 * filters; row selection opens `DetailSheet` exactly like the fixture-driven story. */
export function RefineProjectsScreen() {
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [period, setPeriod] = useState('2026-02');
  const [groupBy, setGroupBy] = useState('project-model');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'per-model', label: 'Per-model breakdown', checked: true },
    { id: 'zero-usage', label: 'Include zero-usage projects', checked: false },
  ]);
  const [generating, setGenerating] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [billingIdentity, setBillingIdentity] = useState('');
  const [planId, setPlanId] = useState<string | null>('pro');
  const plans: CreateProjectPlanOption[] = [
    { id: 'free', name: 'Free' },
    { id: 'pro', name: 'Pro' },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  const filters = useMemo(
    () => buildFilters({ search, statusValue, budgetStateValue }),
    [search, statusValue, budgetStateValue]
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

  const activeSort = table.sorters[0];
  const sort: LedgerSort | undefined = activeSort
    ? { key: activeSort.field, direction: activeSort.order }
    : undefined;

  const filtersActive =
    Boolean(search.trim()) || statusValue !== 'all' || budgetStateValue !== 'all';

  const scopeSlot = (
    <div className="fieldset">
      <span className={fieldLabelClassName}>Scope</span>
      {/* daisy's `input` forces `appearance: none`, which is right for a text input but strips the
          native disclosure arrow off this one raw `<select>`, leaving a select that looks like a
          text box. Restored at the call site rather than in the shared class, so the shared class
          stays safe on any control. (The proper fix is for this Storybook-only mock to use
          `SelectField` — the console-ui skill bans a native select outright — but that is not this
          change's scope.) */}
      <select
        value="account:adorsys-gis"
        onChange={() => {}}
        className={`${fieldControlClassName} appearance-auto`}>
        <option value="account:adorsys-gis">Account · adorsys-gis</option>
      </select>
    </div>
  );

  const newProjectButton = (
    <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
      + New project
    </Button>
  );

  return (
    <RefineMockShell active="projects">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Projects"
          action={
            <>
              <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
                Monthly report
              </Button>
              {newProjectButton}
            </>
          }
        />

        <CreateProjectDialog
          open={createOpen}
          accountLabel="acct_01"
          name={projectName}
          onNameChange={setProjectName}
          billingIdentity={billingIdentity}
          onBillingIdentityChange={setBillingIdentity}
          plans={plans}
          plansLoading={false}
          onRetryPlans={() => {}}
          planId={planId}
          onPlanChange={setPlanId}
          submitting={false}
          canSubmit={projectName.trim().length > 0 && billingIdentity.trim().length > 0}
          onSubmit={() => setCreateOpen(false)}
          onCancel={() => setCreateOpen(false)}
        />

        <ReportExportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          period={period}
          onPeriodChange={setPeriod}
          scopeSlot={scopeSlot}
          groupByOptions={[
            { value: 'project-model', label: 'Project × Model' },
            { value: 'project', label: 'Project' },
            { value: 'model', label: 'Model' },
          ]}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          includeToggles={includeToggles}
          onToggleInclude={(id, checked) =>
            setIncludeToggles((prev) =>
              prev.map((toggle) => (toggle.id === id ? { ...toggle, checked } : toggle))
            )
          }
          format={format}
          onFormatChange={setFormat}
          generating={generating}
          onGenerate={() => {
            setGenerating(true);
            setTimeout(() => setGenerating(false), 400);
          }}
        />

        <Card>
          <ProjectsLedger
            projects={rows}
            loading={loading}
            error={error}
            onRetry={() => table.tableQuery.refetch()}
            search={search}
            onSearchChange={setSearch}
            filters={
              <ManageControls
                statusOptions={manageStatusOptions}
                statusValue={statusValue}
                onStatusChange={setStatusValue}
                budgetStateValue={budgetStateValue}
                budgetStateOptions={manageBudgetStateOptions}
                onBudgetStateChange={setBudgetStateValue}
              />
            }
            emptyState={
              filtersActive ? undefined : (
                <EmptyState
                  headline="No projects yet"
                  explainer="Create a project to start issuing API keys and tracking spend."
                  action={newProjectButton}
                />
              )
            }
            filteredEmptyMessage={filtersActive ? 'No projects match these filters.' : undefined}
            sort={sort}
            onSortChange={(next) => table.setSorters([{ field: next.key, order: next.direction }])}
            selectedRowKeys={selected ? [selected.id] : []}
            onSelectRow={setSelected}
            pagination={{
              shown: rows.length,
              total: table.result.total ?? rows.length,
              hasPrev: table.currentPage > 1,
              hasNext: table.currentPage < table.pageCount,
              onPrev: () => table.setCurrentPage((page) => Math.max(1, page - 1)),
              onNext: () => table.setCurrentPage((page) => Math.min(table.pageCount, page + 1)),
            }}
          />
        </Card>
      </div>

      <BottomSheet portalClassName="lg:hidden"
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.name ?? ''}
        subtitle={selected?.account}>
        {selected ? <ProjectDetail project={selected} /> : null}
      </BottomSheet>
    </RefineMockShell>
  );
}
