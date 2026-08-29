'use client';

import type { AugmentationRequestPage } from '@lightbridge/authz-rpc';
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
 *
 * converse-frontends#267: `listPendingAugmentationRequests` is, by its own name and doc comment
 * (`authz.cstack:1073-1092`), the admin review queue's PENDING read path — there is no schema
 * procedure that lists decided requests. The Decided tab below is therefore built from whatever
 * non-pending rows happen to come back from this same pending-scoped fetch, which is not a
 * complete or reliably paginated listing. `DECIDED_SOURCE_CAVEAT` says so out loud instead of
 * presenting it as one. This is an explicit, recorded implementation choice (keep the tab, with a
 * visible caveat, per ticket #267's option (b)) made because removing the tab is a bigger, more
 * visible UX change than adding a caveat line — it still needs the ticket's own owner sign-off,
 * which this PR does not substitute for.
 */

const PAGE_SIZE = 50;
const QUERY_KEY = ['budget', 'pendingAugmentationRequests', PAGE_SIZE];

const DECIDED_SOURCE_CAVEAT =
  'No dedicated decided-request endpoint exists yet — this list is derived from the pending-queue feed and may be incomplete.';

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
  /** `hasNext` reflects the real `nextCursor` the backend returned — never a fabricated `false`. */
  pagination: { shown: number; hasNext?: boolean };
  /** An honest caveat about the Decided tab's data source — see the module doc comment above. */
  decidedSourceCaveat: string;
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
    queryFn: async (): Promise<AugmentationRequestPage> => {
      return budgetClient.procedures.listPendingAugmentationRequests({
        args: { limit: PAGE_SIZE },
      });
    },
  });

  const requests = useMemo(() => pendingQuery.data?.entries ?? [], [pendingQuery.data]);
  // `null`/`undefined` means "nothing further to page to" per the schema's own contract
  // (`AugmentationRequestPage.nextCursor`) — never assumed `false` before the fetch has answered.
  const nextCursor = pendingQuery.data?.nextCursor ?? null;
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
    // converse-frontends#322: this used to collapse every decision failure into the same generic
    // "The decision was not recorded.", discarding `decide.errorMessage`'s real cause. Now that
    // an empty Decline is blocked client-side before it can ever reach the RPC layer (see
    // `ReviewDetailPanel`'s `handleDecline`), whatever failure does reach here is a genuine
    // server-side rejection (permission, a request already decided, a network error, ...) and
    // deserves its own message — the same pattern `use-api-keys-screen.ts` already uses for
    // `revoke.errorMessage`/`secret.errorMessage` rather than a hardcoded fallback string.
    errorMessage: pendingQuery.isError ? 'Could not load the refill queue.' : decide.errorMessage,
    emptyPendingMessage: `Nothing awaiting a decision. ${decisions.length} decided request${
      decisions.length === 1 ? '' : 's'
    } shown below.`,
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
          // No consumption query is wired up here (Epic 4) — leave both unset so the panel
          // renders an honest "not available" line instead of a fabricated $0.00 of $0.00
          // (converse-frontends#265). The requested amount below is the ONLY real figure.
          requestedAmount: microsToAmount(selected.requestedAmountMicros),
          // `rejectionReason` is written by the REVIEWER on a past decision, never by the
          // requester (authz.cstack:1146-1151) — `requesterNote` is deliberately left unset,
          // there is no requester-authored note anywhere in this schema (converse-frontends#266).
          reviewerNote: selected.rejectionReason ?? undefined,
          // `null`, not `[]`: this container has never fetched a history for any request, so it
          // cannot honestly claim "No previous refills." (converse-frontends#266).
          history: null,
          note,
          onNoteChange: setNote,
          onDecide: (decision, reason) =>
            decide.mutate({ requestId: selected.id, decision, reason }),
          deciding: decide.isPending,
        }
      : null,
    pagination: { shown: decisions.length, hasNext: nextCursor !== null },
    decidedSourceCaveat: DECIDED_SOURCE_CAVEAT,
  };
}
