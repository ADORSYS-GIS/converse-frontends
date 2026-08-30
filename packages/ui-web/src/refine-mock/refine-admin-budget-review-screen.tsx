// Refine-driven container for the ADMIN BUDGET REVIEW screen — `useTable` over the pending
// `refill-requests` queue, `useOne` for the selected request's detail, approve/decline via
// `useCustomMutation` against the mock `refill-requests/decide` endpoint (which moves the row
// into the `decisions` resource). The sections stay pure — this container only adapts hook state
// into their props (console-ui skill "Refine-driven mock screens").
//
// Shell revamp phase 3 (right rail out): the review detail no longer renders inside a right-hand
// aside — row selection opens a `DetailSheet` hosting `ReviewDetailPanel` directly, exactly
// matching `apps/console`'s own `admin-centre.tsx`.

import React, { useState } from 'react';
import { useCustomMutation, useInvalidate, useList, useOne, useTable } from '@refinedev/core';

import { DetailSheet } from '../components/detail-sheet';
import { ReviewDetailPanel } from '../components/review-detail-panel';
import type { ReviewDecision, ReviewHistoryRow } from '../components/review-detail-panel';
import { DecisionsLedger } from '../sections/decisions-ledger';
import type { DecisionRow } from '../sections/decisions-ledger';
import { ReviewQueue } from '../sections/review-queue';
import type { AdminReviewTab, RefillRequestRow } from '../sections/review-queue';
import { PageHeader } from '../sections/page-header';
import type { DecideRefillPayload } from './mock-data-provider';
import { RefineMockShell } from './shared-chrome';

// admin-budget-review.svg's review-detail history — moved here from the deleted
// `sections/review-detail-rail/fixtures.ts`.
const gatewayProdHistory: ReviewHistoryRow[] = [
  { id: 'h1', label: '2 previous refills', amount: 350, meta: 'last 2026-02-08 · approved by sam' },
];

export function RefineAdminBudgetReviewScreen() {
  const [tab, setTab] = useState<AdminReviewTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const pendingTable = useTable<RefillRequestRow>({
    resource: 'refill-requests',
    pagination: { currentPage: 1, pageSize: 6 },
  });
  const decisionsList = useList<DecisionRow>({
    resource: 'decisions',
    pagination: { currentPage: 1, pageSize: 6 },
  });

  const selectedQuery = useOne<RefillRequestRow>({
    resource: 'refill-requests',
    id: selectedId ?? '',
    queryOptions: { enabled: selectedId !== null },
  });

  const decideMutation = useCustomMutation<DecisionRow>();
  const invalidate = useInvalidate();

  const pending = pendingTable.result.data;
  const decisions = decisionsList.result.data;
  const loading = pendingTable.tableQuery.isLoading;
  const error = pendingTable.tableQuery.isError
    ? pendingTable.tableQuery.error?.message
    : undefined;
  const deciding = decideMutation.mutation.isPending;

  const selected = selectedId !== null ? selectedQuery.result : undefined;

  function handleDecide(decision: ReviewDecision) {
    if (!selected) return;
    const values: DecideRefillPayload = { id: selected.id, decision, note, decidedBy: 'sam' };
    decideMutation.mutate(
      { url: 'refill-requests/decide', method: 'post', values },
      {
        onSuccess: async () => {
          await invalidate({ resource: 'refill-requests', invalidates: ['list'] });
          await invalidate({ resource: 'decisions', invalidates: ['list'] });
          setSelectedId(null);
          setNote('');
        },
      }
    );
  }

  const pendingCount = pendingTable.result.total ?? pending.length;
  const decidedCount = decisionsList.result.total ?? decisions.length;

  return (
    <RefineMockShell active="admin" showAdmin>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budget refill review"
          subtitle={`${pendingCount} request${pendingCount === 1 ? '' : 's'} awaiting a decision${
            pending.length > 0 ? ` · oldest submitted ${pending[0]?.submittedAgo}` : ''
          }`}
        />

        <ReviewQueue
          activeTab={tab}
          onTabChange={setTab}
          pendingCount={pendingCount}
          decidedCount={decidedCount}
          pending={pending}
          loading={loading}
          error={error}
          onRetry={() => pendingTable.tableQuery.refetch()}
          selectedRequestId={selectedId}
          onSelectRequest={(row) => setSelectedId(row.id)}
        />

        <DecisionsLedger
          decisions={decisions}
          pagination={{
            shown: pending.length,
            total: pendingCount,
            hasPrev: pendingTable.currentPage > 1,
            hasNext: pendingTable.currentPage < pendingTable.pageCount,
            onPrev: () => pendingTable.setCurrentPage((page) => Math.max(1, page - 1)),
            onNext: () =>
              pendingTable.setCurrentPage((page) => Math.min(pendingTable.pageCount, page + 1)),
          }}
        />
      </div>

      <DetailSheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected?.project ?? ''}>
        {selected ? (
          <ReviewDetailPanel
            key={selectedId}
            subject={selected.project}
            requesterEmail={selected.requesterEmail}
            submittedAt={selected.submittedAgo}
            consumedAmount={selected.consumed ?? undefined}
            ceilingAmount={selected.ceiling ?? undefined}
            requestedAmount={selected.requestedAmount}
            requesterNote="Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar."
            history={gatewayProdHistory}
            note={note}
            onNoteChange={setNote}
            onDecide={(decision) => handleDecide(decision)}
            deciding={deciding}
          />
        ) : null}
      </DetailSheet>
    </RefineMockShell>
  );
}
