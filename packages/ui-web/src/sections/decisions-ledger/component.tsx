import React from 'react';

import { cn } from '../../cn';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { DecisionOutcome, DecisionRow, DecisionsLedgerProps } from './types';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

const DECISION_LABEL: Record<Exclude<DecisionOutcome, 'unknown'>, string> = {
  approved: 'approved',
  auto_approved: 'auto-approved',
  declined: 'declined',
};

/** Grey step only — never green/red. `unknown` renders the backend's own status verbatim. */
function decisionLabel(row: DecisionRow): string {
  return row.decision === 'unknown' ? (row.rawStatus ?? 'unknown') : DECISION_LABEL[row.decision];
}

// Contract: docs/design/console-redesign/README.md §5.4 (admin-budget-review.svg) — the centre's
// lower zone: the audit tail of decisions already made, with its own pager. The outcome is plain
// text in a grey step (`soft` approved / `subtle` declined) — never green/red, never a pill.
export function DecisionsLedger({
  label = 'Recent decisions',
  decisions,
  pagination,
  sourceCaveat,
  className,
}: DecisionsLedgerProps) {
  const columns: LedgerColumn<DecisionRow>[] = [
    { key: 'date', header: 'Date', width: '110px', accessor: (row) => row.date },
    {
      key: 'project',
      header: 'Project',
      width: '160px',
      accessor: (row) => <span className="text-ink">{row.project}</span>,
    },
    { key: 'account', header: 'Account', width: '190px', accessor: (row) => row.account },
    {
      key: 'amount',
      header: 'Amount',
      width: '110px',
      align: 'right',
      accessor: (row) => signedMoney(row.amount),
    },
    {
      key: 'decision',
      header: 'Decision',
      width: '110px',
      accessor: (row) => (
        <span
          className={
            row.decision === 'approved' || row.decision === 'auto_approved'
              ? 'text-soft'
              : 'text-subtle'
          }>
          {decisionLabel(row)}
        </span>
      ),
    },
    {
      key: 'decidedBy',
      header: 'Decided by',
      width: '150px',
      align: 'right',
      accessor: (row) => row.decidedBy,
    },
  ];

  const showPager = Boolean(pagination?.onPrev || pagination?.onNext);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {sourceCaveat ? <InlineStatus>{sourceCaveat}</InlineStatus> : null}

      <div className="flex flex-col gap-2">
        <span className={LABEL_CLASS}>{label}</span>
        <LedgerTable columns={columns} data={decisions} rowKey={(row) => row.id} />
      </div>

      {pagination ? (
        <div className="text-subtle flex items-center justify-between font-mono text-[10px]">
          <span>
            {pagination.total !== undefined
              ? `${pagination.shown} of ${pagination.total} decisions`
              : `${pagination.shown} decision${pagination.shown === 1 ? '' : 's'} shown${
                  pagination.hasNext ? ' · more exist' : ''
                }`}
          </span>
          {showPager ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
