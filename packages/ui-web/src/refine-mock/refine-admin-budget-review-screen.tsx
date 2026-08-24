// Refine-driven container for `AdminBudgetReviewPage` — `useTable` over the pending
// `refill-requests` queue, `useOne` for the selected request's detail, `useUpdate`-flavoured
// approve/decline via `useCustomMutation` against the mock `refill-requests/decide` endpoint
// (moves the row into the `decisions` resource — console-ui skill "Refine-driven mock screens").
// `AdminBudgetReviewPage` stays pure — this container only adapts hook state into its props.

import React, { useState } from 'react';
import { useCustomMutation, useInvalidate, useList, useOne, useTable } from '@refinedev/core';

import type { ConsoleShellTier } from '../components/console-shell';
import type { ReviewDecision } from '../components/review-detail-panel';
import {
  adminAdminNavItems,
  adminNavItems,
  adminSubNavItems,
  gatewayProdHistory,
} from '../pages/admin-budget-review/fixtures';
import { AdminBudgetReviewPage } from '../pages/admin-budget-review';
import type { AdminReviewTab, DecisionRow, RefillRequestRow } from '../pages/admin-budget-review/types';
import type { DecideRefillPayload } from './mock-data-provider';
import { refineMockHeader } from './shared-chrome';

const nav = { items: adminNavItems, adminItems: adminAdminNavItems, showAdmin: true };

export interface RefineAdminBudgetReviewScreenProps {
  tier?: ConsoleShellTier;
}

export function RefineAdminBudgetReviewScreen({ tier = 'full' }: RefineAdminBudgetReviewScreenProps) {
  const [tab, setTab] = useState<AdminReviewTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const pendingTable = useTable<RefillRequestRow>({ resource: 'refill-requests', pagination: { currentPage: 1, pageSize: 6 } });
  const decisionsList = useList<DecisionRow>({ resource: 'decisions', pagination: { currentPage: 1, pageSize: 6 } });

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
  const error = pendingTable.tableQuery.isError ? pendingTable.tableQuery.error?.message : undefined;
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
      },
    );
  }

  return (
    <AdminBudgetReviewPage
      tier={tier}
      header={refineMockHeader}
      nav={nav}
      subNav={{ items: adminSubNavItems }}
      activeTab={tab}
      onTabChange={setTab}
      pendingCount={pendingTable.result.total ?? pending.length}
      decidedCount={decisionsList.result.total ?? decisions.length}
      pending={pending}
      decisions={decisions}
      loading={loading}
      error={error}
      onRetry={() => pendingTable.tableQuery.refetch()}
      selectedRequestId={selectedId}
      onSelectRequest={(row) => setSelectedId(row.id)}
      reviewDetail={
        selected
          ? {
              subject: selected.project,
              requesterEmail: selected.requesterEmail,
              submittedAt: selected.submittedAgo,
              consumedAmount: selected.consumed,
              ceilingAmount: selected.ceiling,
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
      pagination={{
        shown: pending.length,
        total: pendingTable.result.total ?? pending.length,
        hasPrev: pendingTable.currentPage > 1,
        hasNext: pendingTable.currentPage < pendingTable.pageCount,
        onPrev: () => pendingTable.setCurrentPage((page) => Math.max(1, page - 1)),
        onNext: () => pendingTable.setCurrentPage((page) => Math.min(pendingTable.pageCount, page + 1)),
      }}
    />
  );
}
