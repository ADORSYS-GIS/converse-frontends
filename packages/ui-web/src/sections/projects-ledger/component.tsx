import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { Pagination } from '../../components/pagination';
import { formatUsd } from '../../lib/money';
import type { ProjectRow, ProjectsLedgerProps } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatUsd(value);
}

const statusTextClass = (status: ProjectRow['status']): string =>
  status === 'suspended' ? 'text-primary' : status === 'unknown' ? 'text-subtle' : 'text-soft';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the centre zone
// of the Projects screen (renamed from Manage): the projects ledger and its pager inside ONE
// `Card` — `projects-centre.tsx` supplies the card, this section supplies its contents.
//
// 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): THE TOOLBAR IS
// GONE. The search box this section used to draw above the table, and the `filters` slot beside it
// that `ManageControls` filled, are both `PageControls` groups now — the page-level control row on
// the floor between `PageHeader` and this card. That supersedes ADR 0012 D3's "toolbar + table +
// pager inside one Card" clause for every ledger in the console; a `Card` holds content.
//
// Divergence from `manage-projects.svg`, all still true: the mockup draws MEMBERS, KEYS, CEILING
// and USED as numeric columns. None of the four have a real source — MEMBERS/KEYS aren't returned
// by the list endpoint (#270), and CEILING/USED were computed from `projectQuota` coerced through
// `Number()`, which is a governance tier id (e.g. `growth`), not currency (#269). MEMBERS/KEYS
// stay dropped entirely (owner decision, issue #270); CEILING stays a QUOTA TIER column showing
// the tier id as-is; USED stays dropped rather than kept as a permanent dash.
//
// What is NEW in this revamp: ACCOUNT is gone as a column (every row is already filtered to one
// account by the toolbar's own Account filter, so repeating it on every row said nothing a column
// header didn't already say once) and so is the totals footer (`ManageTotals` — an aggregate row
// whose SPEND MTD cell was a permanent em dash is not a total, it is a second unwired column
// wearing a different hat). SPEND MTD is now wired to the account's real per-project consumption
// query (`use-projects-screen.ts`'s `applyProjectSpend`) and is sortable, same as NAME.
export function ProjectsLedger({
  projects,
  loading = false,
  loadingRowCount = 6,
  error,
  onRetry,
  emptyState,
  filteredEmptyMessage,
  sort,
  onSortChange,
  selectedRowKeys,
  onSelectRow,
  pagination,
  className,
}: ProjectsLedgerProps) {
  const columns: LedgerColumn<ProjectRow>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '240px',
      sortable: true,
      accessor: (row) => <span className="text-ink">{row.name}</span>,
    },
    {
      key: 'spendMtd',
      header: 'Spend MTD',
      width: '140px',
      align: 'right',
      sortable: true,
      kind: 'data',
      accessor: (row) => (
        <span className={row.spendMtd === null ? 'text-subtle' : 'text-ink'}>
          {money(row.spendMtd)}
        </span>
      ),
    },
    {
      key: 'quotaTier',
      header: 'Quota tier',
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

  // Zero rows reads two different ways (console-ui skill "States"): no rows AT ALL is an empty
  // COLLECTION (`emptyState`, the `+ New project` CTA belongs here), while a search/filter that
  // narrowed a real collection down to nothing is an empty RESULT (`filteredEmptyMessage`, an
  // inline line — the table stays, because the columns still teach the shape of the data once the
  // filter clears). Which one applies is the caller's call (it alone knows whether a filter is
  // active), signalled by which prop it passes.
  const isEmpty = !loading && !error && projects.length === 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isEmpty && emptyState ? (
        // A true empty COLLECTION replaces the table outright — there is no shape left to teach.
        emptyState
      ) : (
        <>
          {isEmpty && filteredEmptyMessage ? (
            <InlineStatus>{filteredEmptyMessage}</InlineStatus>
          ) : null}

          <LedgerTable
            columns={columns}
            data={projects}
            rowKey={(row) => row.id}
            loading={loading}
            loadingRowCount={loadingRowCount}
            selectedRowKeys={selectedRowKeys}
            onSelectRow={onSelectRow}
            sort={sort}
            onSortChange={onSortChange}
          />

          {pagination ? (
            <Pagination
              shown={pagination.shown}
              total={pagination.total}
              unit="projects"
              hasPrev={pagination.hasPrev ?? false}
              hasNext={pagination.hasNext ?? false}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
