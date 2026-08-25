import React, { useState } from 'react';

import { cn } from '../../cn';
import { ConsoleShell } from '../../components/console-shell';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { LedgerTable } from '../../components/ledger-table';
import type { LedgerColumn } from '../../components/ledger-table';
import { formatMoney } from '../../lib/money';
import { RailPanel } from '../../components/rail-panel';
import { ReviewDetailPanel } from '../../components/review-detail-panel';
import { SectionSheet } from '../../components/section-sheet';
import { SubNav } from '../../components/sub-nav';
import type { AdminBudgetReviewPageProps, DecisionRow, RefillRequestRow } from './types';

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

// Contract: docs/design/console-redesign/README.md §5.4 (admin-budget-review.svg) — pure page
// view. ConsoleShell composition: left rail = nav (admin variant) + Admin sub-nav; centre =
// Pending/Decided text tabs, the pending refill-requests queue (52px review-density rows,
// selectable) and a RECENT DECISIONS ledger below it; right rail = ReviewDetailPanel retargeted
// to the selected request, with Approve/Decline wired to onDecide via reviewDetail.
export function AdminBudgetReviewPage({
  header,
  nav,
  subNav,
  activeTab,
  onTabChange,
  pendingCount,
  decidedCount,
  pending,
  decisions,
  loading = false,
  loadingRowCount = 4,
  error,
  onRetry,
  emptyPendingMessage,
  selectedRequestId,
  onSelectRequest,
  reviewDetail,
  pagination,
  className,
}: AdminBudgetReviewPageProps) {
  const pendingColumns: LedgerColumn<RefillRequestRow>[] = [
    { key: 'submitted', header: 'SUBMITTED', width: '110px', accessor: (row) => row.submittedAgo },
    { key: 'project', header: 'PROJECT', width: '160px', accessor: (row) => <span className="text-ink">{row.project}</span> },
    { key: 'account', header: 'ACCOUNT', width: '190px', accessor: (row) => row.account },
    {
      key: 'consumed',
      header: 'CONSUMED',
      width: '110px',
      align: 'right',
      accessor: (row) => {
        const ratio = row.ceiling > 0 ? row.consumed / row.ceiling : 0;
        return <span className={ratio >= 0.9 ? 'text-primary' : 'text-ink'}>{formatMoney(row.consumed)}</span>;
      },
    },
    { key: 'ceiling', header: 'CEILING', width: '100px', align: 'right', accessor: (row) => formatMoney(row.ceiling) },
    {
      key: 'refill',
      header: 'REFILL',
      width: '100px',
      align: 'right',
      accessor: (row) => <span className="text-ink">{signedMoney(row.requestedAmount)}</span>,
    },
    { key: 'requester', header: 'REQUESTER', width: '160px', align: 'right', accessor: (row) => row.requesterEmail },
  ];

  const decisionColumns: LedgerColumn<DecisionRow>[] = [
    { key: 'date', header: 'DATE', width: '110px', accessor: (row) => row.date },
    { key: 'project', header: 'PROJECT', width: '160px', accessor: (row) => <span className="text-ink">{row.project}</span> },
    { key: 'account', header: 'ACCOUNT', width: '190px', accessor: (row) => row.account },
    { key: 'amount', header: 'AMOUNT', width: '110px', align: 'right', accessor: (row) => signedMoney(row.amount) },
    {
      key: 'decision',
      header: 'DECISION',
      width: '110px',
      accessor: (row) => (
        <span className={row.decision === 'approved' ? 'text-soft' : 'text-subtle'}>{row.decision}</span>
      ),
    },
    { key: 'decidedBy', header: 'DECIDED BY', width: '150px', align: 'right', accessor: (row) => row.decidedBy },
  ];

  const isPendingEmpty = !loading && !error && pending.length === 0;

  // Selection-driven compact-tier sheet — console-ui skill "Shape and layout" (owner revision
  // 2026-08-25): review detail has no trigger of its own, it opens once a request is selected.
  // Adjusted during render rather than in a `useEffect` — the React docs' own recommended
  // pattern for "reset/adjust state when a prop changes" (a conditional `setState` call gated on
  // a ref-tracked previous value, not inside an effect body; React discards the stale render and
  // re-renders immediately, so this never paints an intermediate frame). No tier check needed
  // here either way: `SectionSheet` itself is gated by `useIsBelowLg` (see its own docstring for
  // why simply relying on CSS is not enough), so this can set `open` unconditionally on every
  // selection and trust the sheet to no-op at `lg`.
  //
  // `prevSelectedRequestId` deliberately starts at `null`, never at the mount-time
  // `selectedRequestId` — a page can mount with a request already selected (this component's own
  // `Populated`/`MdTier` stories do exactly that), and that initial selection should open the
  // sheet below `lg` too, not only a *later* change.
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [prevSelectedRequestId, setPrevSelectedRequestId] = useState<string | null>(null);
  if ((selectedRequestId ?? null) !== prevSelectedRequestId) {
    setPrevSelectedRequestId(selectedRequestId ?? null);
    if (reviewDetail) setReviewSheetOpen(true);
  }

  const reviewContent = reviewDetail ? (
    <ReviewDetailPanel {...reviewDetail} />
  ) : (
    <p className="font-sans text-[11px] text-subtle">Select a request to review it.</p>
  );

  return (
    <ConsoleShell
      header={header}
      nav={nav}
      className={className}
      leftSecondary={
        <RailPanel label="ADMIN">
          <SubNav {...subNav} />
        </RailPanel>
      }
      leftSecondaryLabel="Admin"
      rightRail={
        // Only rendered inline at `lg` — below that, review detail opens itself as a
        // `SectionSheet` once a request is selected (see the effects above).
        <RailPanel>{reviewContent}</RailPanel>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-mono text-[22px] leading-[1.25] text-ink">Budget refill review</h1>
          <p className="font-sans text-[11px] text-subtle">
            {pendingCount} request{pendingCount === 1 ? '' : 's'} awaiting a decision
            {pending.length > 0 ? ` · oldest submitted ${pending[0]?.submittedAgo}` : ''}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <button
              type="button"
              onClick={() => onTabChange('pending')}
              className={cn('pb-2', activeTab === 'pending' ? 'text-ink' : 'text-subtle')}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => onTabChange('decided')}
              className={cn('pb-2', activeTab === 'decided' ? 'text-ink' : 'text-subtle')}
            >
              Decided ({decidedCount})
            </button>
          </div>
          <div className="relative h-px bg-raised">
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 h-[2px] w-[74px] bg-primary transition-transform duration-150 ease-out',
                activeTab === 'decided' && 'translate-x-[98px]',
              )}
            />
          </div>
        </div>

        {error ? (
          <ErrorLine message={error} onRetry={onRetry} />
        ) : isPendingEmpty ? (
          <InlineStatus>
            {emptyPendingMessage ?? `Nothing awaiting a decision. ${decidedCount} decided this month.`}
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
            <p className="font-sans text-[11px] text-subtle">Requests expire after 14 days without a decision.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">RECENT DECISIONS</span>
          <LedgerTable columns={decisionColumns} data={decisions} rowKey={(row) => row.id} />
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
                className="text-subtle transition-colors duration-150 ease-out hover:text-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                ‹ prev
              </button>
              <button
                type="button"
                disabled={pagination.hasNext === false}
                onClick={pagination.onNext}
                className="text-soft transition-colors duration-150 ease-out hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                next ›
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <SectionSheet open={reviewSheetOpen} onOpenChange={setReviewSheetOpen} label="REVIEW">
        {reviewContent}
      </SectionSheet>
    </ConsoleShell>
  );
}
