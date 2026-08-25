'use client';

import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import type {
  AdminReviewTab,
  DecisionRow,
  RefillRequestRow,
  ReviewDetailPanelProps,
} from '@lightbridge/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useAdminParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
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
 * View state is the URL (ADR 0011): `?tab=decided&request=req_9` is the reviewer's actual
 * position in the queue, so a request under discussion can be pasted into a thread and Back walks
 * the reviewer out of it. Both params are `push` — the tab is this screen's sub-nav and the
 * request is a selection.
 *
 * Access is gated **server-side** in both `app/(console)/admin/page.tsx` and
 * `app/(console)/@rail/admin/page.tsx` (each 404s a non-admin). The nav gating is only cosmetic,
 * and the backend refuses every one of these procedures without `budget:review` regardless.
 */

const PAGE_SIZE = 50;
const QUERY_KEY = ['budget', 'pendingAugmentationRequests', PAGE_SIZE];

/**
 * Module-level so both zones agree on the identity: the decision is submitted from whichever zone
 * is showing the review panel — the rail at `lg`, the centre's selection sheet below it — while
 * its failure has to surface in the CENTRE's queue error line. Two zones mean two `useMutation`
 * instances, so reading the outcome from the shared `MutationCache` is what makes one instance's
 * failure visible to the other. This is the state that used to be the `decideFailed` boolean in
 * the deleted view-state provider.
 */
const DECIDE_MUTATION_KEY = ['budget', 'decideAugmentationRequest'];

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
  const [view, setView] = useAdminParams();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history ... the decision notes before submit"): a reviewer's free-text
   * rejection reason. It is typed prose about a customer, it is discarded on submit, and putting
   * it in the query string would write it into browser history and into every link copied from
   * the address bar. Only one copy of the review panel is ever visible (the rail at `lg`, the
   * selection sheet below it), so a per-instance draft cannot desynchronise.
   */
  const [note, setNote] = useState('');

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

  const decide = useSharedMutation<
    { requestId: string; decision: 'approve' | 'decline'; reason: string },
    void
  >({
    mutationKey: DECIDE_MUTATION_KEY,
    mutationFn: async ({ requestId, decision, reason }) => {
      if (decision === 'approve') {
        await budgetClient.procedures.approveAugmentationRequest({ args: { requestId } });
        return;
      }
      await budgetClient.procedures.rejectAugmentationRequest({ args: { requestId, reason } });
    },
    onSuccess: () => {
      setNote('');
      void setView({ selectedRequestId: '' });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const selected = requests.find((request) => request.id === view.selectedRequestId) ?? null;
  const rows = view.tab === 'pending' ? pending : decisions;

  return {
    activeTab: view.tab,
    setActiveTab: (tab) => {
      void setView({ tab });
    },
    pending,
    decisions,
    pendingCount: pending.length,
    decidedCount: decisions.length,
    loading: pendingQuery.isLoading,
    errorMessage: pendingQuery.isError
      ? 'Could not load the refill queue.'
      : decide.errorMessage
        ? 'The decision was not recorded.'
        : undefined,
    emptyPendingMessage: `Nothing awaiting a decision. ${decisions.length} decided this period.`,
    retry: () => {
      decide.dismiss();
      void pendingQuery.refetch();
    },
    selectedRequestId: view.selectedRequestId || null,
    selectRequest: (row) => {
      setNote('');
      decide.dismiss();
      void setView({ selectedRequestId: row.id });
    },
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
          note,
          onNoteChange: setNote,
          onDecide: (decision, reason) =>
            decide.mutate({ requestId: selected.id, decision, reason }),
          deciding: decide.isPending,
        }
      : null,
    pagination: { shown: rows.length, total: rows.length, hasPrev: false, hasNext: false },
  };
}
