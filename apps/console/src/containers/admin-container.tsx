'use client';

import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { AdminBudgetReviewPage, type AdminReviewTab } from '@lightbridge/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { ConsoleHeaderBar, adminNavItems, navItems } from '../client/console-chrome';
import { useConsoleBudgetClient } from '../client/rpc-clients';
import { isPending, microsToAmount, toDecisionRow, toRefillRequestRow } from './refill-rows';

/**
 * `/admin` — the budget refill review queue.
 *
 * Unlike the other screens this one is not refine-driven: `listPendingAugmentationRequests`,
 * `approveAugmentationRequest` and `rejectAugmentationRequest` are cratestack **procedures** on the
 * `authz-budget` microservice, and a refine `DataProvider` only models resource CRUD. They go
 * through TanStack Query directly — the same `QueryClient` refine uses, so the IndexedDB
 * persistence and the offline behaviour are identical.
 *
 * Access is gated **server-side** in `app/admin/page.tsx` (which 404s a non-admin). The nav
 * gating here is only cosmetic, and the backend refuses every one of these procedures without
 * `budget:review` regardless.
 */

const PAGE_SIZE = 50;

export function AdminContainer() {
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminReviewTab>('pending');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const queryKey = ['budget', 'pendingAugmentationRequests', PAGE_SIZE];
  const pendingQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<AugmentationRequest[]> => {
      const page = await budgetClient.procedures.listPendingAugmentationRequests({
        args: { limit: PAGE_SIZE },
      });
      return page.entries;
    },
  });

  const requests = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and
  // "submitted 2 days ago" is relative to when the queue was read, not to this render.
  const now = pendingQuery.dataUpdatedAt;

  const pending = useMemo(
    () => requests.filter(isPending).map((request) => toRefillRequestRow(request, now)),
    [requests, now]
  );
  const decisions = useMemo(
    () => requests.filter((request) => !isPending(request)).map(toDecisionRow),
    [requests]
  );

  const decide = useMutation({
    mutationFn: async ({
      requestId,
      decision,
      reason,
    }: {
      requestId: string;
      decision: 'approve' | 'decline';
      reason: string;
    }) => {
      if (decision === 'approve') {
        await budgetClient.procedures.approveAugmentationRequest({ args: { requestId } });
        return;
      }
      await budgetClient.procedures.rejectAugmentationRequest({
        args: { requestId, reason },
      });
    },
    onSuccess: () => {
      setSelectedRequestId(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const selected = requests.find((request) => request.id === selectedRequestId) ?? null;
  const rows = activeTab === 'pending' ? pending : decisions;

  return (
    <AdminBudgetReviewPage
      header={<ConsoleHeaderBar />}
      nav={{
        items: navItems('admin'),
        adminItems: adminNavItems('admin'),
        showAdmin: true,
      }}
      subNav={{
        items: [{ key: 'refills', label: 'Refill requests', count: pending.length, active: true }],
      }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={pending.length}
      decidedCount={decisions.length}
      pending={pending}
      decisions={decisions}
      loading={pendingQuery.isLoading}
      loadingRowCount={6}
      error={
        pendingQuery.isError
          ? 'Could not load the refill queue.'
          : decide.isError
            ? 'The decision was not recorded.'
            : undefined
      }
      onRetry={() => void pendingQuery.refetch()}
      emptyPendingMessage={`Nothing awaiting a decision. ${decisions.length} decided this period.`}
      selectedRequestId={selectedRequestId}
      onSelectRequest={(row) => {
        setSelectedRequestId(row.id);
        setNote('');
      }}
      reviewDetail={
        selected
          ? {
              subject: selected.projectId ?? selected.accountId,
              requesterEmail: selected.accountId,
              submittedAt: selected.createdAt,
              // The balance procedures are a separate surface; the panel shows the request itself
              // rather than an invented consumption figure.
              consumedAmount: 0,
              ceilingAmount: microsToAmount(selected.requestedAmountMicros),
              requestedAmount: microsToAmount(selected.requestedAmountMicros),
              requesterNote: selected.rejectionReason ?? undefined,
              history: [],
              note,
              onNoteChange: setNote,
              onDecide: (decision, reason) =>
                decide.mutate({ requestId: selected.id, decision, reason }),
              deciding: decide.isPending,
            }
          : null
      }
      pagination={{
        shown: rows.length,
        total: rows.length,
        hasPrev: false,
        hasNext: false,
      }}
    />
  );
}
