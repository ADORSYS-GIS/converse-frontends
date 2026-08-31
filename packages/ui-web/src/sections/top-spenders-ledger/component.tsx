import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { DELTA_GLYPH, statCardDeltaVariants } from '../../components/stat-card';
import { formatUsd } from '../../lib/money';
import type { TopSpenderRow, TopSpendersLedgerProps } from './types';

const SCOPE_LABEL: Record<TopSpenderRow['scope'], string> = {
  account: 'Account',
  project: 'Project',
};

/**
 * The operator overview's own "who is drawing the most" ledger (admin-overview design batch,
 * dashboard 3) — accounts and projects on ONE ranking rather than two separate tables, since
 * splitting them would hide the actual rank order the section exists to show. `LedgerTable`
 * carries the geometry; this section owns only the column set and the sort.
 *
 * Renders uncontained on the floor — panelling (a `Card`) is the consumer's decision, same
 * contract every other ledger section states.
 */
export function TopSpendersLedger({
  rows,
  loading = false,
  loadingRowCount = 8,
  error,
  onRetry,
  emptyMessage = 'No spend recorded across the estate this period.',
  className,
}: TopSpendersLedgerProps) {
  // Ranked here, not by the caller — the rank IS the section's message (`BudgetPressure`'s own
  // sort carries the identical rationale).
  const ranked = [...rows].sort((a, b) => b.spendMtd - a.spendMtd);

  const columns: LedgerColumn<TopSpenderRow>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '220px',
      accessor: (row) => (
        <div>
          <span className="text-ink">{row.name}</span>
          {row.account ? <span className="text-subtle"> — {row.account}</span> : null}
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      width: '100px',
      accessor: (row) => SCOPE_LABEL[row.scope],
    },
    {
      key: 'spendMtd',
      header: 'Spend MTD',
      width: '140px',
      align: 'right',
      kind: 'data',
      accessor: (row) => <span className="text-ink">{formatUsd(row.spendMtd)}</span>,
    },
    {
      key: 'delta',
      header: 'Δ vs previous period',
      width: '180px',
      align: 'right',
      kind: 'data',
      accessor: (row) => (
        <span className={statCardDeltaVariants({ direction: row.delta.direction })}>
          <span aria-hidden="true">{DELTA_GLYPH[row.delta.direction]}</span> {row.delta.label}
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last active',
      width: '140px',
      align: 'right',
      kind: 'data',
      accessor: (row) => row.lastActiveLabel,
    },
  ];

  return (
    <div className={className}>
      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : (
        <>
          {!loading && ranked.length === 0 ? <InlineStatus>{emptyMessage}</InlineStatus> : null}
          <LedgerTable
            columns={columns}
            data={ranked}
            rowKey={(row) => row.key}
            loading={loading}
            loadingRowCount={loadingRowCount}
          />
        </>
      )}
    </div>
  );
}
