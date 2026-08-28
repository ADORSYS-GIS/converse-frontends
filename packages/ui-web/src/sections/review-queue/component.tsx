import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import type { RefillRequestRow, ReviewQueueProps } from './types';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

// Contract: docs/design/console-redesign/README.md §5.4 (admin-budget-review.svg) — the centre's
// upper zone: the Pending/Decided text tabs (counts go in the tab labels, never in a badge) above
// the pending refill queue at review density, selectable one row at a time.
//
// The tabs drive the underline and the pager's subject only — both tables stay mounted, since the
// RECENT DECISIONS ledger below is a separate zone (`DecisionsLedger`) with its own data.
export function ReviewQueue({
  activeTab,
  onTabChange,
  pendingCount,
  decidedCount,
  pending,
  loading = false,
  loadingRowCount = 4,
  error,
  onRetry,
  emptyPendingMessage,
  selectedRequestId,
  onSelectRequest,
  className,
}: ReviewQueueProps) {
  const pendingColumns: LedgerColumn<RefillRequestRow>[] = [
    { key: 'submitted', header: 'SUBMITTED', width: '110px', accessor: (row) => row.submittedAgo },
    {
      key: 'project',
      header: 'PROJECT',
      width: '160px',
      accessor: (row) => <span className="text-ink">{row.project}</span>,
    },
    { key: 'account', header: 'ACCOUNT', width: '190px', accessor: (row) => row.account },
    {
      key: 'consumed',
      header: 'CONSUMED',
      width: '110px',
      align: 'right',
      accessor: (row) => {
        // `—` when either figure is unavailable — never a fabricated $0.00 dressed up as a real
        // measurement (converse-frontends#265).
        if (row.consumed === null || row.ceiling === null) {
          return <span className="text-subtle">—</span>;
        }
        const ratio = row.ceiling > 0 ? row.consumed / row.ceiling : 0;
        return (
          <span className={ratio >= 0.9 ? 'text-primary' : 'text-ink'}>
            {formatMoney(row.consumed)}
          </span>
        );
      },
    },
    {
      key: 'ceiling',
      header: 'CEILING',
      width: '100px',
      align: 'right',
      accessor: (row) => (row.ceiling === null ? '—' : formatMoney(row.ceiling)),
    },
    {
      key: 'refill',
      header: 'REFILL',
      width: '100px',
      align: 'right',
      accessor: (row) => <span className="text-ink">{signedMoney(row.requestedAmount)}</span>,
    },
    {
      key: 'requester',
      header: 'REQUESTER',
      width: '160px',
      align: 'right',
      accessor: (row) => row.requesterEmail,
    },
  ];

  const isPendingEmpty = !loading && !error && pending.length === 0;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div>
        <div className="flex items-center gap-6 font-mono text-xs">
          <button
            type="button"
            onClick={() => onTabChange('pending')}
            className={cn('pb-2', activeTab === 'pending' ? 'text-ink' : 'text-subtle')}>
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('decided')}
            className={cn('pb-2', activeTab === 'decided' ? 'text-ink' : 'text-subtle')}>
            Decided ({decidedCount})
          </button>
        </div>
        <div className="bg-raised relative h-px">
          <span
            aria-hidden="true"
            className={cn(
              'bg-primary absolute bottom-0 h-[2px] w-[74px] transition-transform duration-150 ease-out',
              activeTab === 'decided' && 'translate-x-[98px]'
            )}
          />
        </div>
      </div>

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : isPendingEmpty ? (
        <InlineStatus>
          {emptyPendingMessage ??
            `Nothing awaiting a decision. ${decidedCount} decided request${decidedCount === 1 ? '' : 's'} shown below.`}
        </InlineStatus>
      ) : null}

      <div className="flex flex-col gap-2">
        <LedgerTable
          columns={pendingColumns}
          data={pending}
          rowKey={(row) => row.id}
          density="review"
          loading={loading}
          loadingRowCount={loadingRowCount}
          selectedRowKeys={selectedRequestId ? [selectedRequestId] : []}
          onSelectRow={onSelectRequest}
        />
        {pending.length > 0 ? (
          <p className="text-subtle font-sans text-[11px]">
            Requests expire after 14 days without a decision.
          </p>
        ) : null}
      </div>
    </div>
  );
}
