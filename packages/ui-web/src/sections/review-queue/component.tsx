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
    { key: 'submitted', header: 'Submitted', width: '110px', accessor: (row) => row.submittedAgo },
    {
      key: 'project',
      header: 'Project',
      width: '160px',
      accessor: (row) => <span className="text-ink">{row.project}</span>,
    },
    { key: 'account', header: 'Account', width: '190px', accessor: (row) => row.account },
    {
      key: 'consumed',
      header: 'Consumed',
      width: '110px',
      align: 'right',
      accessor: (row) => {
        const ratio = row.ceiling > 0 ? row.consumed / row.ceiling : 0;
        return (
          <span className={ratio >= 0.9 ? 'text-primary' : 'text-ink'}>
            {formatMoney(row.consumed)}
          </span>
        );
      },
    },
    { key: 'ceiling', header: 'Ceiling', width: '100px', align: 'right', accessor: (row) => formatMoney(row.ceiling) },
    {
      key: 'refill',
      header: 'Refill',
      width: '100px',
      align: 'right',
      accessor: (row) => <span className="text-ink">{signedMoney(row.requestedAmount)}</span>,
    },
    { key: 'requester', header: 'Requester', width: '160px', align: 'right', accessor: (row) => row.requesterEmail },
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
        <div className="relative h-px bg-raised">
          <span
            aria-hidden="true"
            className={cn(
              'absolute bottom-0 h-[2px] w-[74px] bg-primary transition-transform duration-150 ease-out',
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
            `Nothing awaiting a decision. ${decidedCount} decided this month.`}
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
          <p className="font-sans text-[11px] text-subtle">
            Requests expire after 14 days without a decision.
          </p>
        ) : null}
      </div>
    </div>
  );
}
