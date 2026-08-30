// Refine-driven container for the ADMIN BUDGET REVIEW screen — `useTable` over the pending
// `refill-requests` queue, `useOne` for the selected request's detail, approve/decline via
// `useCustomMutation` against the mock `refill-requests/decide` endpoint (which moves the row
// into the `decisions` resource). The sections stay pure — this container only adapts hook state
// into their props (console-ui skill "Refine-driven mock screens").

import React, { useState } from 'react';
import { useCustomMutation, useInvalidate, useList, useOne, useTable } from '@refinedev/core';

import { Card } from '../components/card';
import type { ReviewDecision } from '../components/review-detail-panel';
import { SelectionSheet } from '../components/selection-sheet';
import { SubNav } from '../components/sub-nav';
import { DecisionsLedger } from '../sections/decisions-ledger';
import type { DecisionRow } from '../sections/decisions-ledger';
import { REVIEW_DETAIL_RAIL_LABEL, ReviewDetailRail } from '../sections/review-detail-rail';
import { gatewayProdHistory } from '../sections/review-detail-rail/fixtures';
import { ReviewQueue } from '../sections/review-queue';
import type { AdminReviewTab, RefillRequestRow } from '../sections/review-queue';
import { PageHeader } from '../sections/page-header';
import { adminSubNavItems } from '../pages-stories/shell-fixtures';
import type { DecideRefillPayload } from './mock-data-provider';
import { RefineMockShell } from './shared-chrome';

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

  const reviewRail = (
    <ReviewDetailRail
      detail={
        selected
          ? {
              subject: selected.project,
              requesterEmail: selected.requesterEmail,
              submittedAt: selected.submittedAgo,
              consumedAmount: selected.consumed ?? undefined,
              ceilingAmount: selected.ceiling ?? undefined,
              requestedAmount: selected.requestedAmount,
              requesterNote:
                'Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar.',
              history: gatewayProdHistory,
              note,
              onNoteChange: setNote,
              onDecide: (decision) => handleDecide(decision),
              deciding,
            }
          : null
      }
    />
  );

  return (
    <RefineMockShell
      active="admin"
      showAdmin
      aside={
        <>
          <Card title="Admin">
            <SubNav items={adminSubNavItems} />
          </Card>
          <Card>{reviewRail}</Card>
        </>
      }>
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

      <SelectionSheet selectionKey={selectedId} label={REVIEW_DETAIL_RAIL_LABEL}>
        {reviewRail}
      </SelectionSheet>
    </RefineMockShell>
  );
}
