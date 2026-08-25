import React from 'react';

import { cn } from '../../cn';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import { SECTION_LABEL } from '../dashboard-label';
import type { DecisionRow, DecisionsLedgerProps } from './types';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

// Contract: docs/design/console-redesign/README.md §5.4 (admin-budget-review.svg) — the centre's
// lower zone: the audit tail of decisions already made, with its own pager. The outcome is plain
// text in a grey step (`soft` approved / `subtle` declined) — never green/red, never a pill.
export function DecisionsLedger({
  label = 'RECENT DECISIONS',
  decisions,
  pagination,
  className,
}: DecisionsLedgerProps) {
  const columns: LedgerColumn<DecisionRow>[] = [
    { key: 'date', header: 'DATE', width: '110px', accessor: (row) => row.date },
    {
      key: 'project',
      header: 'PROJECT',
      width: '160px',
      accessor: (row) => <span className="text-ink">{row.project}</span>,
    },
    { key: 'account', header: 'ACCOUNT', width: '190px', accessor: (row) => row.account },
    { key: 'amount', header: 'AMOUNT', width: '110px', align: 'right', accessor: (row) => signedMoney(row.amount) },
    {
      key: 'decision',
      header: 'DECISION',
      width: '110px',
      accessor: (row) => (
        <span className={row.decision === 'approved' ? 'text-soft' : 'text-subtle'}>
          {row.decision}
        </span>
      ),
    },
    { key: 'decidedBy', header: 'DECIDED BY', width: '150px', align: 'right', accessor: (row) => row.decidedBy },
  ];

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-2">
        <span className={SECTION_LABEL}>{label}</span>
        <LedgerTable columns={columns} data={decisions} rowKey={(row) => row.id} />
      </div>

      {pagination ? (
        <div className="flex items-center justify-between font-mono text-[10px] text-subtle">
          <span>
            {pagination.shown} of {pagination.total} decisions
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
