'use client';

import type {
  AugmentationRequest,
  AugmentationRequestPage,
  UserProfile,
} from '@lightbridge/authz-rpc';
import type {
  LedgerSort,
  RefillRequester,
  RefillRequestRow,
  ReviewDetailPanelProps,
} from '@lightbridge/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useConsoleAuthzClient, useConsoleBudgetClient } from '../client/rpc-clients';
import { useAdminParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import {
  isPending,
  microsToAmount,
  requesterIdsOf,
  toRefillRequestRow,
  toRequester,
} from './refill-rows';
import { userProfilesQuery } from './user-profiles-query';

/**
 * `/admin/refills-queue` — the budget refill review queue's data adapter, shared by its centre
 * (`refills-queue-centre.tsx`) and the `BottomSheet` it opens on row pick.
 *
 * Unlike the other screens this one is not refine-driven: `listPendingAugmentationRequests`,
 * `approveAugmentationRequest` and `rejectAugmentationRequest` are cratestack **procedures** on
 * the `authz-budget` microservice, and a refine `DataProvider` only models resource CRUD. They go
 * through TanStack Query directly — the same `QueryClient` refine uses, so the IndexedDB
 * persistence and the offline behaviour are identical.
 *
 * View state is the URL (ADR 0011): `?request=req_9` is the reviewer's actual position in the
 * queue, so a request under discussion can be pasted into a thread and Back walks the reviewer
 * out of it. `sort`/`dir` are the Submitted column's own state; `after` is the page cursor.
 *
 * Access is gated **server-side** in `app/(console)/admin/refills-queue/page.tsx` (404s a
 * non-admin) — the one route segment this screen renders behind (see
 * `admin-refills-queue-route-gate.test.ts`). The nav gating is only cosmetic, and the backend
 * refuses every one of these procedures without `budget:review` regardless.
 *
 * Phase 6 (admin/settings revamp) deletes the Pending/Decided tab and everything it fed:
 * `listPendingAugmentationRequests` is, by its own name and doc comment (`authz.cstack:1073-1092`),
 * the admin review queue's PENDING-only read path — there is no schema procedure that lists
 * decided requests, so the deleted Decided tab was built from whatever non-pending rows happened
 * to come back from this same pending-scoped fetch, which was never a complete or reliably
 * paginated listing. Removing the tab (rather than keeping it with a caveat, ticket #267's other
 * option) is the resolution this revamp makes.
 *
 * `PROJECT_LABEL_FALLBACK`/`accountScopeLabel` resolve `projectId`/`accountId` to real display
 * names the same way `use-overview-screen.ts` resolves its own scope labels — from
 * `useConsoleScope()`'s unfiltered `allProjects`/`allAccounts` — so the queue and the review
 * detail panel never show a raw uuid (converse-frontends#270's correction applied here too).
 */

const PROJECT_LABEL_FALLBACK = '—';
const PAGE_SIZE = 25;
const QUERY_KEY = ['budget', 'pendingAugmentationRequests', PAGE_SIZE];

/**
 * Requester resolution failed but the queue itself did not (converse-frontends#444). Rendered as
 * an `InlineStatus` above the table — the rows are real and decidable, only their names are
 * missing, and a failed secondary lookup must never blank a page of pending decisions.
 */
const REQUESTER_DEGRADED_MESSAGE =
  'Requester names could not be resolved — showing the raw user id instead.';

/**
 * Module-level so both zones agree on the identity: the decision is submitted from whichever zone
 * is showing the review panel — the rail at `lg`, the centre's selection sheet below it — while
 * its failure has to surface in the CENTRE's queue error line. Two zones mean two `useMutation`
 * instances, so reading the outcome from the shared `MutationCache` is what makes one instance's
 * failure visible to the other.
 */
const DECIDE_MUTATION_KEY = ['budget', 'decideAugmentationRequest'];

export interface RefillsQueueScreen {
  pending: RefillRequestRow[];
  pendingCount: number;
  loading: boolean;
  errorMessage: string | undefined;
  retry: () => void;

  sort: LedgerSort;
  setSort: (sort: LedgerSort) => void;

  pagination: {
    shown: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };

  /** Set only when the requester batch failed — the queue renders it above the table. */
  requesterStatus: string | undefined;

  selectedRequestId: string | null;
  selectRequest: (row: RefillRequestRow) => void;
  /** Closes `DetailSheet` — clears `?request=`. */
  clearSelection: () => void;
  reviewDetail: ReviewDetailPanelProps | null;
}

/**
 * `enabled` (phase 4) — gates the network fetch only, never the hook's other state. Two more
 * callers share this hook besides `RefillsQueueCentre`'s own full queue view: `use-overview-screen.ts`
 * derives its "Refill requests" card from the same query, and `console-chrome.tsx`'s sidebar
 * derives the Operator nav row's trailing count from it, both fired only `session.isAdmin ===
 * true` ("fire NO extra query for non-admins" — shell revamp phase 4 brief). Defaults to `true` so
 * `RefillsQueueCentre` — already behind the server-side role gate — needs no change.
 */
export function useRefillsQueueScreen(enabled = true): RefillsQueueScreen {
  const budgetClient = useConsoleBudgetClient();
  // `resolveUserProfiles` lives on `authz-api` (`crates/lightbridge-authz-rest/src/
  // identity_directory.rs`), not on `authz-budget` — a different service behind a different proxy
  // route, hence a second client here rather than another call on `budgetClient`.
  const authzClient = useConsoleAuthzClient();
  const queryClient = useQueryClient();
  const scope = useConsoleScope();
  const [view, setView] = useAdminParams();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history ... the decision notes before submit"): a reviewer's free-text
   * rejection reason. It is typed prose about a customer, it is discarded on submit, and putting
   * it in the query string would write it into browser history and into every link copied from
   * the address bar.
   */
  const [note, setNote] = useState('');

  /**
   * SANCTIONED LOCAL STATE: the stack of page cursors a `Previous` press needs. `?after=` (URL)
   * names the CURRENT page's cursor; this is the trail of cursors that got the reviewer there,
   * which is a browser-history-shaped concept — not itself a fact about "what am I looking at"
   * the way `after` is — so it stays local rather than round-tripping through the URL as a
   * second, redundant param. Reset is unnecessary: a mutation success only ever removes a row
   * from whichever page is current, it never invalidates a cursor already visited.
   */
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const pendingQuery = useQuery({
    queryKey: [...QUERY_KEY, view.after],
    queryFn: async (): Promise<AugmentationRequestPage> => {
      return budgetClient.procedures.listPendingAugmentationRequests({
        args: { limit: PAGE_SIZE, after: view.after || undefined },
      });
    },
    enabled,
  });

  const requests = useMemo(() => pendingQuery.data?.entries ?? [], [pendingQuery.data]);
  // `null`/`undefined` means "nothing further to page to" per the schema's own contract
  // (`AugmentationRequestPage.nextCursor`) — never assumed `false` before the fetch has answered.
  const nextCursor = pendingQuery.data?.nextCursor ?? null;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure, and
  // "submitted 2 days ago" is relative to when the queue was read, not to this render.
  const now = pendingQuery.dataUpdatedAt;

  const pendingRequests = useMemo(() => requests.filter(isPending), [requests]);

  const sort: LedgerSort = { key: view.sortKey, direction: view.sortDirection };

  const sortedRequests = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...pendingRequests].sort(
      (a, b) => factor * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
    );
  }, [pendingRequests, sort.direction]);

  /**
   * ONE batch per page (converse-frontends#444's acceptance criterion): every `requestedByUserId`
   * on the page, de-duplicated and sorted, resolved by a single `resolveUserProfiles` call rather
   * than one call per row. The ids come from the WHOLE fetched page (`requests`), not just the
   * pending subset the table paints, because `selected` — the request the detail panel renders —
   * is looked up in `requests` too.
   *
   * The 200-id cap `ResolveUserProfilesInput` documents cannot be reached from here: `PAGE_SIZE`
   * is 25, so the list is at most 25 ids long.
   */
  const requesterIds = useMemo(() => requesterIdsOf(requests), [requests]);

  const requesterQuery = useQuery({
    ...userProfilesQuery(authzClient, requesterIds),
    // Nothing to ask for: a page whose every row predates the migration has no id to resolve, and
    // firing an empty batch would be a request that cannot answer anything.
    enabled: enabled && requesterIds.length > 0,
  });

  /**
   * The batch's answer, as a lookup.
   *
   * `undefined` while it is in flight — which `toRequester` renders as its own `resolving`
   * sentinel rather than as "unresolved". An id we have not asked about yet and an id the backend
   * had nothing for are different claims, and only one of them is the reviewer's problem.
   *
   * A FAILED batch is not an absent one either: it becomes an EMPTY map, which resolves every id
   * to the `unresolved` sentinel (the raw id, de-emphasised) and pairs with `requesterStatus`
   * above the table, instead of leaving the column spinning on `resolving` forever.
   */
  const profilesById = useMemo(() => {
    if (requesterQuery.isError) return new Map<string, UserProfile>();
    if (!requesterQuery.data) return undefined;
    return new Map(requesterQuery.data.map((profile) => [profile.userId, profile]));
  }, [requesterQuery.data, requesterQuery.isError]);

  const requesterFor = useMemo(() => {
    return (request: AugmentationRequest): RefillRequester =>
      toRequester(request.requestedByUserId, profilesById);
  }, [profilesById]);

  const allProjects = scope.allProjects;
  const allAccounts = scope.allAccounts;

  const labelFor = useMemo(() => {
    return (request: AugmentationRequest): { project: string; account: string } => {
      const project = request.projectId
        ? (allProjects.find((p) => p.id === request.projectId)?.name ?? PROJECT_LABEL_FALLBACK)
        : PROJECT_LABEL_FALLBACK;
      const account = allAccounts.find((a) => a.id === request.accountId);
      return { project, account: account ? accountScopeLabel(account) : request.accountId };
    };
  }, [allProjects, allAccounts]);

  const pending = useMemo(
    () =>
      sortedRequests.map((request) => {
        const { project, account } = labelFor(request);
        return toRefillRequestRow(request, now, project, account, requesterFor(request));
      }),
    [sortedRequests, now, labelFor, requesterFor]
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
  const selectedLabels = selected ? labelFor(selected) : null;

  return {
    pending,
    pendingCount: pending.length,
    loading: pendingQuery.isLoading,
    // converse-frontends#322: this used to collapse every decision failure into the same generic
    // "The decision was not recorded.", discarding `decide.errorMessage`'s real cause. An empty
    // Decline is blocked client-side before it can ever reach the RPC layer (see
    // `ReviewDetailPanel`'s `handleDecline`), so whatever failure does reach here is a genuine
    // server-side rejection and deserves its own message.
    errorMessage: pendingQuery.isError ? 'Could not load the refill queue.' : decide.errorMessage,
    retry: () => {
      decide.dismiss();
      void pendingQuery.refetch();
    },
    sort,
    setSort: (next) => {
      void setView({ sortKey: next.key as 'submitted', sortDirection: next.direction });
    },
    pagination: {
      shown: pending.length,
      hasPrev: cursorStack.length > 0,
      hasNext: nextCursor !== null,
      onPrev: () => {
        setCursorStack((stack) => {
          const next = [...stack];
          const previous = next.pop() ?? '';
          void setView({ after: previous });
          return next;
        });
      },
      onNext: () => {
        if (!nextCursor) return;
        setCursorStack((stack) => [...stack, view.after]);
        void setView({ after: nextCursor });
      },
    },
    requesterStatus: requesterQuery.isError ? REQUESTER_DEGRADED_MESSAGE : undefined,
    selectedRequestId: view.selectedRequestId || null,
    selectRequest: (row) => {
      setNote('');
      decide.dismiss();
      void setView({ selectedRequestId: row.id });
    },
    clearSelection: () => {
      setNote('');
      decide.dismiss();
      void setView({ selectedRequestId: '' });
    },
    reviewDetail:
      selected && selectedLabels
        ? {
            requester: requesterFor(selected),
            projectLabel: selectedLabels.project,
            accountLabel: selectedLabels.account,
            submittedAt: selected.createdAt,
            requestedAmount: microsToAmount(selected.requestedAmountMicros),
            // `rejectionReason` is written by the REVIEWER on a past decision, never by the
            // requester (authz.cstack:1146-1151) — `requesterNote` is deliberately left unset,
            // there is no requester-authored note anywhere in this schema (converse-frontends#266).
            reviewerNote: selected.rejectionReason ?? undefined,
            note,
            onNoteChange: setNote,
            onDecide: (decision, reason) =>
              decide.mutate({ requestId: selected.id, decision, reason }),
            deciding: decide.isPending,
          }
        : null,
  };
}
