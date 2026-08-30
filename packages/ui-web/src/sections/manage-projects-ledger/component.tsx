import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatUsd } from '../../lib/money';
import type { ManageProjectsLedgerProps, ProjectRow } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatUsd(value);
}

const statusTextClass = (status: ProjectRow['status']): string =>
  status === 'suspended' ? 'text-primary' : status === 'unknown' ? 'text-subtle' : 'text-soft';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the centre zone
// of the Manage screen: the projects ledger with its totals footer, and the pager. Money is
// right-aligned and always two decimals; `null` spend renders as an em dash rather than a
// fabricated zero.
//
// Shell revamp phase 3 (right rail out): search, `+ New project` and the FILTERS/MONTHLY REPORT
// triggers used to open here, in a toolbar row above the table — the row is gone along with them.
// Search is `ManageControls` in `PageHeader.controls`; `+ New project` and `Monthly report` are
// both `PageHeader.action` now (see `manage-centre.tsx`), so this section owns only the table
// itself.
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
  selectedRowKeys,
  onSelectRow,
  pagination,
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
