// Refine-driven container for the MANAGE screen — console-ui skill "Refine-driven mock screens":
// `useTable` over the `projects` resource, adapted into the Manage sections' props exactly the
// way `apps/console` does once it swaps this mock data provider for `@cratestack/refine`'s
// generated one (docs/adr/0009-nextjs-console-replacement.md Decision 4). The sections stay pure —
// this container only translates hook state (`isLoading` → skeleton props, `isError` → error
// props, `result.data` → rows) into their props.

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useTable } from '@refinedev/core';

import type { CreateProjectPlanOption } from '../components/create-project-dialog';
import { CreateProjectDialog } from '../components/create-project-dialog';
import { fieldControlClassName, fieldLabelClassName } from '../components/field/field-classes';
import { InlineStatus } from '../components/inline-status';
import { RailPanel } from '../components/rail-panel';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { SelectionSheet } from '../components/selection-sheet';
import { SubNav } from '../components/sub-nav';
import { MANAGE_FILTERS_RAIL_LABEL, ManageFiltersRail } from '../sections/manage-filters-rail';
import {
  manageAccountOptions,
  manageBudgetStateOptions,
  manageStatusOptions,
} from '../sections/manage-filters-rail/fixtures';
import { ManageProjectsLedger } from '../sections/manage-projects-ledger';
import type { ProjectRow } from '../sections/manage-projects-ledger';
import { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from '../sections/manage-report-rail';
import {
  MANAGE_SELECTION_RAIL_LABEL,
  ManageSelectionRail,
} from '../sections/manage-selection-rail';
import { ScreenHeading } from '../sections/screen-heading';
import { manageSubNavItems } from '../pages-stories/shell-fixtures';
import { RefineMockShell } from './shared-chrome';

/**
 * Matches `apps/console`'s `MANAGE_SPEND_PENDING_MESSAGE` (`use-manage-screen.ts`) verbatim —
 * duplicated rather than imported because `packages/ui-web` never depends on `apps/console`.
 * Console-ui#326 dropped the "(ADR 0009 follow-ups 4 and 6)" citation from the real string
 * (follow-up 4 shipped, so citing it was simply wrong); this copy follows.
 */
const MANAGE_SPEND_PENDING_MESSAGE =
  'Spend and quota ceiling are unwired: no usage-backend query client yet. Project status and quota tier below are live.';

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
  if (accountValue !== 'all')
    filters.push({ field: 'account', operator: 'eq', value: accountValue });
  if (statusValue !== 'all') filters.push({ field: 'status', operator: 'eq', value: statusValue });
  // Real signal, not a numeric-ceiling coercion (issue #269): whether a governance quota tier is
  // assigned at all.
  if (budgetStateValue === 'quota-set')
    filters.push({ field: 'quotaTier', operator: 'ne', value: null });
  if (budgetStateValue === 'no-quota')
    filters.push({ field: 'quotaTier', operator: 'eq', value: null });
  return filters;
}

/** Live-wired Manage screen: `useTable` drives the ledger, pagination and server-side filters;
 * row selection retargets the right-rail SELECTION section exactly like the fixture-driven story. */
export function RefineManageScreen() {
  const [search, setSearch] = useState('');
  const [accountValue, setAccountValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');
  const [budgetStateValue, setBudgetStateValue] = useState('all');
  const [selected, setSelected] = useState<ProjectRow | null>(null);

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
    () => buildFilters({ search, accountValue, statusValue, budgetStateValue }),
    [search, accountValue, statusValue, budgetStateValue]
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

  // Spend has no live source yet (Epic 4) — every row's SPEND MTD is already `null` in the mock
  // fixtures, so the honest total is `null` too, never a fabricated sum.
  const totals =
    rows.length > 0
      ? {
          shownLabel: `TOTAL · ${rows.length} SHOWN`,
          spendMtd: null,
        }
      : undefined;

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

  const filtersRail = (
    <ManageFiltersRail
      accountValue={accountValue}
      accountOptions={manageAccountOptions}
      onAccountChange={setAccountValue}
      statusOptions={manageStatusOptions}
      statusValue={statusValue}
      onStatusChange={setStatusValue}
      budgetStateValue={budgetStateValue}
      budgetStateOptions={manageBudgetStateOptions}
      onBudgetStateChange={setBudgetStateValue}
    />
  );

  const reportRail = (
    <ManageReportRail
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
  );

  const selectionRail = <ManageSelectionRail project={selected} />;

  return (
    <RefineMockShell
      active="manage"
      leftSecondary={
        <RailPanel label="MANAGE">
          <SubNav items={manageSubNavItems} />
        </RailPanel>
      }
      leftSecondaryLabel="Manage"
      rail={
        <>
          <RailPanel label={MANAGE_REPORT_RAIL_LABEL}>{reportRail}</RailPanel>
          <RailPanel label={MANAGE_FILTERS_RAIL_LABEL}>{filtersRail}</RailPanel>
          <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>{selectionRail}</RailPanel>
        </>
      }>
      <div className="flex flex-col gap-6">
        <ScreenHeading title="Projects" />
        <InlineStatus>{MANAGE_SPEND_PENDING_MESSAGE}</InlineStatus>

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

        <ManageProjectsLedger
          projects={rows}
          loading={loading}
          error={error}
          onRetry={() => table.tableQuery.refetch()}
          totals={totals}
          search={search}
          onSearchChange={setSearch}
          onNewProject={() => setCreateOpen(true)}
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
          toolbarActions={
            <SectionSheetTrigger
              icon="filter"
              triggerLabel="Open filters"
              label={MANAGE_FILTERS_RAIL_LABEL}>
              {filtersRail}
            </SectionSheetTrigger>
          }
          reportTrigger={
            <SectionSheetTrigger
              icon="report"
              triggerLabel="Open monthly report"
              label={MANAGE_REPORT_RAIL_LABEL}>
              {reportRail}
            </SectionSheetTrigger>
          }
        />
      </div>

      <SelectionSheet selectionKey={selected?.id ?? null} label={MANAGE_SELECTION_RAIL_LABEL}>
        {selectionRail}
      </SelectionSheet>
    </RefineMockShell>
  );
}
