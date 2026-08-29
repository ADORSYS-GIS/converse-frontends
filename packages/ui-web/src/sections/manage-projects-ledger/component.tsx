import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatUsd } from '../../lib/money';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ManageProjectsLedgerProps, ProjectRow } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatUsd(value);
}

const statusTextClass = (status: ProjectRow['status']): string =>
  status === 'suspended' ? 'text-primary' : status === 'unknown' ? 'text-subtle' : 'text-soft';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the centre zone
// of the Manage screen: a search/new-project toolbar, the projects ledger with its totals footer,
// and the pager. Money is right-aligned and always two decimals; `null` spend renders as an em
// dash rather than a fabricated zero.
//
// Divergence from `manage-projects.svg`: the mockup draws MEMBERS, KEYS, CEILING and USED as
// numeric columns. None of the four have a real source — MEMBERS/KEYS aren't returned by the list
// endpoint (#270), and CEILING/USED were computed from `projectQuota` coerced through `Number()`,
// which is a governance tier id (e.g. `growth`), not currency (#269) — so there is no numeric
// ceiling in this contract to compute USED against, not just an unwired one. MEMBERS/KEYS are
// dropped entirely (owner decision, issue #270); CEILING is replaced by a QUOTA TIER column
// showing the tier id as-is; USED is dropped rather than kept as a permanent dash, since (unlike
// SPEND MTD) there is no planned future data source that makes it a number. See the PR body for
// the full writeup.
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
  newProjectDisabled = false,
  newProjectReason,
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
      header: 'Name',
      width: '220px',
      accessor: (row) => <span className="text-ink">{row.name}</span>,
    },
    { key: 'account', header: 'Account', width: '170px', accessor: (row) => row.account },
    {
      key: 'spendMtd',
      header: 'Spend MTD',
      width: '140px',
      align: 'right',
      accessor: (row) => (
        <span className={row.spendMtd === null ? 'text-subtle' : 'text-ink'}>
          {money(row.spendMtd)}
        </span>
      ),
    },
    {
      key: 'quotaTier',
      header: 'QUOTA TIER',
      width: '140px',
      align: 'right',
      accessor: (row) => (
        <span className={row.quotaTier === null ? 'text-subtle' : undefined}>
          {row.quotaTier ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
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
        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            variant="primary"
            onClick={onNewProject}
            disabled={newProjectDisabled}
            className="w-full md:w-auto md:self-end">
            + New project
          </Button>
          {newProjectDisabled && newProjectReason ? (
            <span className="text-subtle font-mono text-[11px] leading-[1.4]">
              {newProjectReason}
            </span>
          ) : null}
        </div>
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
                // No `ceiling`/`quotaTier`/`usedPercent` key: those columns have no real
                // aggregate (quotaTier is categorical, spend's total is honestly unwired), so
                // their footer cells render empty rather than a fabricated sum.
                spendMtd: (
                  <span className={totals.spendMtd === null ? 'text-subtle' : 'text-ink'}>
                    {money(totals.spendMtd)}
                  </span>
                ),
              }
            : undefined
        }
      />

      {reportTrigger ? (
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <span className={LABEL_CLASS}>Monthly report</span>
          {reportTrigger}
        </div>
      ) : null}

      {pagination ? (
        <div className="text-subtle flex items-center justify-between font-mono text-[10px]">
          <span>
            {pagination.shown} of {pagination.total} projects
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={pagination.hasPrev === false}
              onClick={pagination.onPrev}
              className="text-subtle hover:text-soft transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60">
              ‹ prev
            </button>
            <button
              type="button"
              disabled={pagination.hasNext === false}
              onClick={pagination.onNext}
              className="text-soft hover:text-ink transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60">
              next ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
