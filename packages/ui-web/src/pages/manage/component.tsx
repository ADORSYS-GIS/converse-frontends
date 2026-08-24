import React from 'react';

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

  const filterAccountLabel =
    filters.accountOptions.find((option) => option.value === filters.accountValue)?.label ?? filters.accountValue;

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
      rightRailTitle="REPORT & FILTERS"
      rightRailPeek={
        <span className="font-mono text-[10px] text-subtle">
          {reportExport.period} · {filterAccountLabel}
        </span>
      }
      rightRail={
        <div className="flex flex-col gap-3">
          <RailPanel label="MONTHLY REPORT">
            <ReportExportPanel {...reportExport} />
          </RailPanel>
          <RailPanel label="FILTERS">
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
          </RailPanel>
          <RailPanel label="SELECTION">
            {selectedProject ? (
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
            )}
          </RailPanel>
        </div>
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
          <Field
            label="Search"
            containerClassName="w-full md:w-[300px]"
            placeholder="Find a project…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
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
    </ConsoleShell>
  );
}
