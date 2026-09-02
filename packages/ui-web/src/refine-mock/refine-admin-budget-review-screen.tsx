// Refine-driven container for the ADMIN BUDGET REVIEW screen — `useTable` over the pending
// `refill-requests` queue, `useOne` for the selected request's detail, approve/decline via
// `useCustomMutation` against the mock `refill-requests/decide` endpoint. The sections stay pure
// — this container only adapts hook state into their props (console-ui skill "Refine-driven mock
// screens").
//
// Phase 6 (admin/settings revamp): the Pending/Decided tab and the `decisions` resource it read
// are both gone — `refill-requests/decide` (`mock-data-provider.ts`) simply removes the row now,
// it no longer moves it into a second resource. Row selection opens a `DetailSheet` hosting
// `ReviewDetailPanel` directly, exactly matching `apps/console`'s own `admin-centre.tsx`.

import React, { useState } from 'react';
import { useCustomMutation, useInvalidate, useOne, useTable } from '@refinedev/core';

import { Card } from '../components/card';
import type { LedgerSort } from '../components/ledger-table';
import { BottomSheet } from '../components/bottom-sheet';
import { ReviewDetailPanel } from '../components/review-detail-panel';
import type { ReviewDecision } from '../components/review-detail-panel';
import { ReviewQueue } from '../sections/review-queue';
import type { RefillRequestRow } from '../sections/review-queue';
import { PageHeader } from '../sections/page-header';
import type { DecideRefillPayload } from './mock-data-provider';
import { RefineMockShell } from './shared-chrome';

export function RefineAdminBudgetReviewScreen() {
  const [sort, setSort] = useState<LedgerSort>({ key: 'submitted', direction: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const pendingTable = useTable<RefillRequestRow>({
    resource: 'refill-requests',
    pagination: { currentPage: 1, pageSize: 6 },
  });

  const selectedQuery = useOne<RefillRequestRow>({
    resource: 'refill-requests',
    id: selectedId ?? '',
    queryOptions: { enabled: selectedId !== null },
  });

  const decideMutation = useCustomMutation<RefillRequestRow>();
  const invalidate = useInvalidate();

  const pending = pendingTable.result.data;
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
          setSelectedId(null);
          setNote('');
        },
      }
    );
  }

  const pendingCount = pendingTable.result.total ?? pending.length;

  return (
    <RefineMockShell active="admin" showAdmin>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budget refill review"
          subtitle={`${pendingCount} request${pendingCount === 1 ? '' : 's'} awaiting a decision${
            pending.length > 0 ? ` · oldest submitted ${pending[0]?.submittedAgo}` : ''
          }`}
        />

        <Card>
          <ReviewQueue
            pending={pending}
            loading={loading}
            error={error}
            onRetry={() => pendingTable.tableQuery.refetch()}
            sort={sort}
            onSortChange={setSort}
            selectedRequestId={selectedId}
            onSelectRequest={(row) => setSelectedId(row.id)}
            pagination={{
              shown: pending.length,
              hasPrev: pendingTable.currentPage > 1,
              hasNext: pendingTable.currentPage < pendingTable.pageCount,
              onPrev: () => pendingTable.setCurrentPage((page) => Math.max(1, page - 1)),
              onNext: () =>
                pendingTable.setCurrentPage((page) => Math.min(pendingTable.pageCount, page + 1)),
            }}
          />
        </Card>
      </div>

      <BottomSheet
        portalClassName="lg:hidden"
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected?.project ?? ''}>
        {selected ? (
          <ReviewDetailPanel
            key={selectedId}
            requester={selected.requester}
            projectLabel={selected.project}
            accountLabel={selected.account}
            submittedAt={selected.submittedAgo}
            requestedAmount={selected.requestedAmount}
            requesterNote="Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar."
            note={note}
            onNoteChange={setNote}
            onDecide={(decision) => handleDecide(decision)}
            deciding={deciding}
          />
        ) : null}
      </BottomSheet>
    </RefineMockShell>
  );
}
