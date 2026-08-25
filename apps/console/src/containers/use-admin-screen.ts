'use client';

import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import type {
  AdminReviewTab,
  DecisionRow,
  RefillRequestRow,
  ReviewDetailPanelProps,
} from '@lightbridge/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useAdminViewState } from '../client/view-state';
import { isPending, microsToAmount, toDecisionRow, toRefillRequestRow } from './refill-rows';

/**
 * `/admin` — the budget refill review queue's data adapter, shared by its centre (`page.tsx`) and
 * its rail (`@rail/admin/page.tsx`).
 *
 * Unlike the other screens this one is not refine-driven: `listPendingAugmentationRequests`,
 * `approveAugmentationRequest` and `rejectAugmentationRequest` are cratestack **procedures** on
 * the `authz-budget` microservice, and a refine `DataProvider` only models resource CRUD. They go
 * through TanStack Query directly — the same `QueryClient` refine uses, so the IndexedDB
 * persistence and the offline behaviour are identical. Centre and rail share the one query key,
 * so the queue is fetched once regardless of how many zones read it.
 *
 * Access is gated **server-side** in both `app/(console)/admin/page.tsx` and
 * `app/(console)/@rail/admin/page.tsx` (each 404s a non-admin). The nav gating is only cosmetic,
 * and the backend refuses every one of these procedures without `budget:review` regardless.
 */

const PAGE_SIZE = 50;
const QUERY_KEY = ['budget', 'pendingAugmentationRequests', PAGE_SIZE];

export interface AdminScreen {
  activeTab: AdminReviewTab;
  setActiveTab: (tab: AdminReviewTab) => void;
  pending: RefillRequestRow[];
  decisions: DecisionRow[];
  pendingCount: number;
  decidedCount: number;
  loading: boolean;
  errorMessage: string | undefined;
  emptyPendingMessage: string;
  retry: () => void;
  selectedRequestId: string | null;
  selectRequest: (row: RefillRequestRow) => void;
  reviewDetail: ReviewDetailPanelProps | null;
  pagination: { shown: number; total: number; hasPrev: boolean; hasNext: boolean };
}

export function useAdminScreen(): AdminScreen {
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();
  const [view, patchView] = useAdminViewState();

  const pendingQuery = useQuery({
    queryKey: QUERY_KEY,
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
      await budgetClient.procedures.rejectAugmentationRequest({ args: { requestId, reason } });
    },
    onSuccess: () => {
      patchView({ selectedRequestId: null, note: '', decideFailed: false });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => patchView({ decideFailed: true }),
  });

  const selected = requests.find((request) => request.id === view.selectedRequestId) ?? null;
  const rows = view.activeTab === 'pending' ? pending : decisions;

  return {
    activeTab: view.activeTab,
    setActiveTab: (activeTab) => patchView({ activeTab }),
    pending,
    decisions,
    pendingCount: pending.length,
    decidedCount: decisions.length,
    loading: pendingQuery.isLoading,
    errorMessage: pendingQuery.isError
      ? 'Could not load the refill queue.'
      : view.decideFailed
        ? 'The decision was not recorded.'
        : undefined,
    emptyPendingMessage: `Nothing awaiting a decision. ${decisions.length} decided this period.`,
    retry: () => {
      patchView({ decideFailed: false });
      void pendingQuery.refetch();
    },
    selectedRequestId: view.selectedRequestId,
    selectRequest: (row) => patchView({ selectedRequestId: row.id, note: '', decideFailed: false }),
    reviewDetail: selected
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
          note: view.note,
          onNoteChange: (note) => patchView({ note }),
          onDecide: (decision, reason) =>
            decide.mutate({ requestId: selected.id, decision, reason }),
          deciding: decide.isPending,
        }
      : null,
    pagination: { shown: rows.length, total: rows.length, hasPrev: false, hasNext: false },
  };
}
