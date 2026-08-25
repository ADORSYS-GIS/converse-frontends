import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import { SECTION_LABEL } from '../dashboard-label';
import type { ManageProjectsLedgerProps, ProjectRow } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatMoney(value);
}

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

const statusTextClass = (status: ProjectRow['status']): string =>
  status === 'near ceiling' ? 'text-primary' : status === 'archived' ? 'text-subtle' : 'text-soft';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the centre zone
// of the Manage screen: a search/new-project toolbar, the projects ledger with its totals footer,
// and the pager. Money is right-aligned and always two decimals; `null` spend/ceiling figures
// render as an em dash rather than a fabricated zero.
export function ManageProjectsLedger({
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
  pagination,
  toolbarActions,
  reportTrigger,
  className,
}: ManageProjectsLedgerProps) {
  const columns: LedgerColumn<ProjectRow>[] = [
    {
      key: 'name',
      header: 'NAME',
      width: '200px',
      accessor: (row) => <span className="text-ink">{row.name}</span>,
    },
    { key: 'account', header: 'ACCOUNT', width: '150px', accessor: (row) => row.account },
    { key: 'members', header: 'MEMBERS', width: '90px', align: 'right', accessor: (row) => row.members },
    { key: 'keys', header: 'KEYS', width: '80px', align: 'right', accessor: (row) => row.keys },
    {
      key: 'spendMtd',
      header: 'SPEND MTD',
      width: '130px',
      align: 'right',
      accessor: (row) => (
        <span className={row.spendMtd === null ? 'text-subtle' : 'text-ink'}>
          {money(row.spendMtd)}
        </span>
      ),
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

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-end gap-2">
          <Field
            label="Search"
            containerClassName="w-full md:w-[300px]"
            placeholder="Find a project…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {toolbarActions}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onNewProject}
          className="w-full md:w-auto md:self-end">
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

      {reportTrigger ? (
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <span className={SECTION_LABEL}>MONTHLY REPORT</span>
          {reportTrigger}
        </div>
      ) : null}

      {pagination ? (
        <div className="flex items-center justify-between font-mono text-[10px] text-subtle">
          <span>
            {pagination.shown} of {pagination.total} projects
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={pagination.hasPrev === false}
              onClick={pagination.onPrev}
              className="text-subtle transition-colors duration-150 ease-out hover:text-soft disabled:cursor-not-allowed disabled:opacity-60">
              ‹ prev
            </button>
            <button
              type="button"
              disabled={pagination.hasNext === false}
              onClick={pagination.onNext}
              className="text-soft transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60">
              next ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
