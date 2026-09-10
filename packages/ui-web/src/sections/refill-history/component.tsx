import React from 'react';

import type { LedgerColumn } from '../../components/ledger-table';
import { LedgerTable } from '../../components/ledger-table';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { formatUsd } from '../../lib/money';
import { ZoneHeading } from '../../lib/zone-heading';
import type { RefillHistoryProps, RefillHistoryRow } from './types';

/**
 * `/accounts/<id>/refill`'s own history card — the caller's own past refill requests
 * (`procedure.listMyAugmentationRequests`, IA v3 phase 3). Three columns only: Submitted, Amount,
 * Status — no Project/Account columns the way the admin `ReviewQueue` carries, since every row
 * here already belongs to the one account this page is scoped to.
 */
export function RefillHistory({ state, className }: RefillHistoryProps) {
  const columns: LedgerColumn<RefillHistoryRow>[] = [
    {
      key: 'submitted',
      header: 'Submitted',
      width: '140px',
      kind: 'data',
      accessor: (row) => row.submittedAgo,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '110px',
      align: 'right',
      kind: 'data',
      accessor: (row) => `+${formatUsd(row.amount)}`,
    },
    { key: 'status', header: 'Status', accessor: (row) => row.statusLabel },
  ];

  return (
    <div className={className}>
      <ZoneHeading label="Your refill requests" />
      <div className="mt-4">
        {state.status === 'unavailable' ? (
          <InlineStatus>{state.caption}</InlineStatus>
        ) : state.status === 'error' ? (
          <ErrorLine
            message={state.errorMessage ?? 'Could not load your refill history.'}
            onRetry={state.onRetry}
          />
        ) : state.status === 'loading' ? (
          <LedgerTable
            columns={columns}
            data={[]}
            rowKey={(row) => row.id}
            loading
            loadingRowCount={3}
          />
        ) : state.rows.length === 0 ? (
          <EmptyState
            headline="No refill requests yet"
            explainer="A request you submit above appears here, with the operator's decision once it lands."
          />
        ) : (
          <LedgerTable columns={columns} data={state.rows} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}
