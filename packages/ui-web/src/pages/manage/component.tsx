import React, { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ConsoleShell } from '../../components/console-shell';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { fieldLabelClassName } from '../../components/field/cva';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import { RailPanel } from '../../components/rail-panel';
import { ReportExportPanel } from '../../components/report-export-panel';
import { SectionSheet } from '../../components/section-sheet';
import { SegmentedControl } from '../../components/segmented-control';
import { SubNav } from '../../components/sub-nav';
import type { ManagePageProps, ProjectRow } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatMoney(value);
}

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

const statusTextClass = (status: ProjectRow['status']): string =>
  status === 'near ceiling' ? 'text-primary' : status === 'archived' ? 'text-subtle' : 'text-soft';

function selectClassName() {
  return 'h-[30px] w-full appearance-none rounded-[2px] border border-border bg-chrome px-3 font-mono text-xs text-soft focus:border-primary focus:outline-none';
}

// Compact-tier (below `lg`) contextual sheet triggers — console-ui skill "Shape and layout"
// (owner revision 2026-08-25). MONTHLY REPORT's trigger sits by the table's totals/footer zone
// (judgement call: the report summarises exactly the aggregate figures shown there, a tighter
// pairing than the title row) rather than the title row. SELECTION has no trigger of its own —
// it is selection-driven, opening automatically once a row is selected.
function FilterIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M2 10V6M6 10V2M10 10V4" strokeLinecap="round" />
    </svg>
  );
}

function SectionTriggerButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick} className="lg:hidden">
      {icon}
    </Button>
  );
}

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — pure page view.
// ConsoleShell composition: left rail = nav + Manage sub-nav (Projects/Accounts/Budgets/Members);
// centre = projects ledger with a totals footer; right rail = ReportExportPanel (MONTHLY REPORT)
// + LAST EXPORTS (carried inside reportExport.lastExports) + FILTERS + SELECTION for the
// row the consumer has targeted via onSelectRow / selectedProject.
export function ManagePage({
  header,
  nav,
  subNav,
  projects,
  loading = false,
  loadingRowCount = 6,
  error,
  onRetry,
  emptyMessage,
  totals,
  search,
  onSearchChange,
  onNewProject,
  selectedRowKeys,
  onSelectRow,
  selectedProject,
  pagination,
  reportExport,
  filters,
  className,
}: ManagePageProps) {
  const columns: LedgerColumn<ProjectRow>[] = [
    { key: 'name', header: 'NAME', width: '200px', accessor: (row) => <span className="text-ink">{row.name}</span> },
    { key: 'account', header: 'ACCOUNT', width: '150px', accessor: (row) => row.account },
    { key: 'members', header: 'MEMBERS', width: '90px', align: 'right', accessor: (row) => row.members },
    { key: 'keys', header: 'KEYS', width: '80px', align: 'right', accessor: (row) => row.keys },
    {
      key: 'spendMtd',
      header: 'SPEND MTD',
      width: '130px',
      align: 'right',
      accessor: (row) => <span className={row.spendMtd === null ? 'text-subtle' : 'text-ink'}>{money(row.spendMtd)}</span>,
    },
    { key: 'ceiling', header: 'CEILING', width: '110px', align: 'right', accessor: (row) => money(row.ceiling) },
    { key: 'usedPercent', header: 'USED', width: '80px', align: 'right', accessor: (row) => percent(row.usedPercent) },
    {
      key: 'status',
      header: 'STATUS',
      width: '110px',
      align: 'right',
      accessor: (row) => <span className={statusTextClass(row.status)}>{row.statusLabel}</span>,
    },
  ];

  const isEmpty = !loading && !error && projects.length === 0;

  // Compact-tier (below `lg`) sheet state — the page owns this now, not `ConsoleShell` (owner
  // revision 2026-08-25, console-ui skill "Shape and layout"). SELECTION is selection-driven:
  // it opens whenever the targeted row changes, rather than needing its own trigger.
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [selectionSheetOpen, setSelectionSheetOpen] = useState(false);

  // Selection-driven open, adjusted during render rather than in a `useEffect` — the React docs'
  // own recommended pattern for "reset/adjust state when a prop changes" (a conditional `setState`
  // call gated on a ref-tracked previous value, not inside an effect body; React discards the
  // stale render and re-renders immediately, so this never paints an intermediate frame). No
  // tier check needed here either way: `SectionSheet` itself is gated by `useIsBelowLg` (see its
  // own docstring for why simply relying on CSS is not enough), so this can set `open`
  // unconditionally on every selection and trust the sheet to no-op at `lg`.
  //
  // `prevSelectedProjectId` deliberately starts at `null`, never at the mount-time
  // `selectedProject?.id` — a page can mount with a project already selected (e.g. deep-linking
  // into a project, or this component's own `RowSelected` story), and that initial selection
  // should open the sheet below `lg` too, not only a *later* change.
  const [prevSelectedProjectId, setPrevSelectedProjectId] = useState<string | null>(null);
  if ((selectedProject?.id ?? null) !== prevSelectedProjectId) {
    setPrevSelectedProjectId(selectedProject?.id ?? null);
    if (selectedProject) setSelectionSheetOpen(true);
  }

  // Section content, factored out so each renders twice: once inline inside a `RailPanel` (the
  // persistent `lg` rail) and once bare inside a `SectionSheet` (the compact-tier trigger
  // target — `SectionSheet`'s own header already supplies the heading).
  const filterFields = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Account</span>
        <select
          value={filters.accountValue}
          onChange={(event) => filters.onAccountChange(event.target.value)}
          className={selectClassName()}
        >
          {filters.accountOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Status</span>
        <SegmentedControl
          aria-label="Project status"
          options={filters.statusOptions}
          value={filters.statusValue}
          onChange={filters.onStatusChange}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Budget state</span>
        <select
          value={filters.budgetStateValue}
          onChange={(event) => filters.onBudgetStateChange(event.target.value)}
          className={selectClassName()}
        >
          {filters.budgetStateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const selectionContent = selectedProject ? (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-sm text-ink">{selectedProject.name}</span>
      <span className="font-mono text-[11px] text-subtle">{selectedProject.account}</span>
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <span className="font-mono text-[11px] text-subtle">Spend MTD</span>
        <span className="font-mono text-xs text-soft">{money(selectedProject.spendMtd)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] text-subtle">Ceiling</span>
        <span className="font-mono text-xs text-soft">{money(selectedProject.ceiling)}</span>
      </div>
    </div>
  ) : (
    <p className="font-sans text-[11px] text-subtle">No rows selected.</p>
  );

  return (
    <ConsoleShell
      header={header}
      nav={nav}
      className={className}
      leftSecondary={
        <RailPanel label="MANAGE">
          <SubNav {...subNav} />
        </RailPanel>
      }
      leftSecondaryLabel="Manage"
      rightRail={
        // A Fragment, not a wrapping `<div>`: the rail column in `ConsoleShell` applies
        // `bg-surface divide-y divide-raised` to its direct children, so each `RailPanel`
        // section here must render as a direct DOM child of that column for the hairline
        // separators to land between sections instead of around one wrapping box (console-ui
        // skill "Rails are flush, aligned, full-height columns", owner revision 2026-08-25).
        // Only rendered inline at `lg` — below that, FILTERS/MONTHLY REPORT are reachable via
        // their own contextual triggers, and SELECTION opens itself on row selection.
        <>
          <RailPanel label="MONTHLY REPORT">
            <ReportExportPanel {...reportExport} />
          </RailPanel>
          <RailPanel label="FILTERS">{filterFields}</RailPanel>
          <RailPanel label="SELECTION">{selectionContent}</RailPanel>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-mono text-[22px] leading-[1.25] text-ink">Projects</h1>
          <p className="font-sans text-[11px] text-subtle">
            spend shown month-to-date
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-end gap-2">
            <Field
              label="Search"
              containerClassName="w-full md:w-[300px]"
              placeholder="Find a project…"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <SectionTriggerButton
              label="Open filters"
              icon={<FilterIcon />}
              onClick={() => setFiltersSheetOpen(true)}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onNewProject}
            className="w-full md:w-auto md:self-end"
          >
            + New project
          </Button>
        </div>

        {error ? (
          <ErrorLine message={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <InlineStatus>{emptyMessage ?? 'No projects in this account yet.'}</InlineStatus>
        ) : null}

        <LedgerTable
          columns={columns}
          data={projects}
          rowKey={(row) => row.id}
          loading={loading}
          loadingRowCount={loadingRowCount}
          selectedRowKeys={selectedRowKeys}
          onSelectRow={onSelectRow}
          totals={
            totals
              ? {
                  name: totals.shownLabel,
                  spendMtd: <span className="text-ink">{formatMoney(totals.spendMtd)}</span>,
                  ceiling: formatMoney(totals.ceiling),
                  usedPercent: `${Math.round(totals.usedPercent)}%`,
                }
              : undefined
          }
        />

        {/* MONTHLY REPORT trigger — placed by the table's totals/footer zone rather than the
            title row (judgement call, stated in the PR body): the report summarises exactly the
            aggregate figures shown in that footer, a tighter pairing than the page title. */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">Monthly report</span>
          <SectionTriggerButton
            label="Open monthly report"
            icon={<ReportIcon />}
            onClick={() => setReportSheetOpen(true)}
          />
        </div>

        {pagination ? (
          <div className={cn('flex items-center justify-between font-mono text-[10px] text-subtle')}>
            <span>
              {pagination.shown} of {pagination.total} projects
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={pagination.hasPrev === false}
                onClick={pagination.onPrev}
                className="text-subtle transition-colors duration-150 ease-out hover:text-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                ‹ prev
              </button>
              <button
                type="button"
                disabled={pagination.hasNext === false}
                onClick={pagination.onNext}
                className="text-soft transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                next ›
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <SectionSheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen} label="FILTERS">
        {filterFields}
      </SectionSheet>
      <SectionSheet open={reportSheetOpen} onOpenChange={setReportSheetOpen} label="MONTHLY REPORT">
        <ReportExportPanel {...reportExport} />
      </SectionSheet>
      <SectionSheet open={selectionSheetOpen} onOpenChange={setSelectionSheetOpen} label="SELECTION">
        {selectionContent}
      </SectionSheet>
    </ConsoleShell>
  );
}
