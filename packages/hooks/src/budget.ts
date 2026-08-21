import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AugmentationRequest, MyBudgetRefillLadder } from '@lightbridge/authz-rpc';
import { createId, getBudgetRpcClient } from '@lightbridge/authz-rpc';
import { useAuthSession } from './auth-session';
import { currentBudgetPeriod } from './budget-tiers';

// `BudgetLadderRung` (the pre-ADR-0015 ladder-position type) is deliberately NOT re-exported here
// -- its only consumer, `LadderVisibilityPanel` in budget-refill-view.tsx, was removed: under a
// flat, admin-configured amount set there is no ladder *position* left to display.
// lightbridge-authz#387 has now removed `currentTier`/`currentTierAmountMicros`/`nextTier`/
// `nextTierAmountMicros`/`ladder` from `MyBudgetRefillLadder` on the wire entirely (they were kept
// byte-for-byte additive alongside `allowedAmountsMicros` only until this frontend switched over
// and deployed -- see that PR's description). Nothing in this repo reads them any more either.
export type { AugmentationRequest, MyBudgetRefillLadder } from '@lightbridge/authz-rpc';

// Pure formatting/tier constants live in ./budget-tiers.ts (its own dependency-free package
// subpath) specifically so a presentational view can import them without pulling in
// `@lightbridge/authz-rpc` -- see that file's module-level comment. Re-exported here so the
// `@lightbridge/hooks` barrel still carries everything for screens/other hook consumers.
export * from './budget-tiers';

/**
 * A fresh idempotency key for one refill attempt. Callers must generate a new key per user-
 * initiated submit and reuse the SAME key only when retrying that exact same failed attempt
 * (`RefillService::find_existing` on the backend uses it to recognize a genuine retry and avoid
 * evaluating/granting twice) -- never on a fresh submit, even of the same tier.
 */
export function createBudgetIdempotencyKey(): string {
  return createId();
}

/** Query key for the caller's own ladder-position preview, scoped by `period` -- a different
 * calendar month is a different snapshot, never the same cache entry. */
export function myBudgetRefillLadderQueryKey(period: string) {
  return ['budget', 'my-refill-ladder', period] as const;
}

/**
 * Extracted from `useMyBudgetRefillLadder`'s `queryFn` for the same reason `requestBudgetRefill`
 * is extracted from `useRequestBudgetRefill`'s `mutationFn` above -- callable directly in a test
 * without rendering the hook. Routed through `getBudgetRpcClient`, never `getAuthzRpcClient` --
 * see that comment for why.
 */
export async function getMyBudgetRefillLadder(period: string): Promise<MyBudgetRefillLadder> {
  return getBudgetRpcClient().procedures.getMyBudgetRefillLadder({ args: { period } });
}

/**
 * The read-only companion to `useRequestBudgetRefill`: where the caller currently sits on the
 * ADR-0008 ladder for `period`, and what the next refill would grant if approved --
 * `procedure.getMyBudgetRefillLadder`, gated at the same `budget:self-refill` permission as
 * `requestBudgetRefill` itself. This is visibility, not a picker -- see the NOTE on
 * `RequestBudgetRefillArgs` below for why there is still no caller-chosen tier anywhere on this
 * wire. `enabled` mirrors `useBillingPlans`'s pattern: callers that don't have permission to
 * refill at all can skip the fetch entirely rather than always paying for a 403.
 */
export function useMyBudgetRefillLadder(period: string, enabled = true) {
  const { isAuthenticated } = useAuthSession();

  return useQuery<MyBudgetRefillLadder>({
    queryKey: myBudgetRefillLadderQueryKey(period),
    queryFn: () => getMyBudgetRefillLadder(period),
    enabled: isAuthenticated && enabled,
    // Changes at most once per submitted refill (this account's own action) -- short enough to
    // reflect a refill made in another tab/device within a session, long enough not to refetch on
    // every focus of a screen that's otherwise idle.
    staleTime: 30_000,
  });
}

/**
 * NOTE ON `requestedAmountMicros` (ADR-0015): lightbridge-authz#386 reversed the "caller chooses
 * nothing" model this type was originally built under -- the caller-chosen amount, checked
 * server-side against the active policy's offered set (`MyBudgetRefillLadder.allowedAmountsMicros`)
 * before evaluation. It started as optional on the wire (`RequestBudgetRefillInput`) while the
 * pre-ADR-0015 server-side `current_tier.next()` derivation still existed as a fallback;
 * lightbridge-authz#387 removed that fallback and made the field REQUIRED on the wire, once this
 * frontend was confirmed to always send it. Required here too as of that change, not merely by
 * convention -- there is no longer a server-side path that runs without it. Always sourced from
 * `useMyBudgetRefillLadder`'s `allowedAmountsMicros`; see `budget-refill-screen.tsx` for the
 * selection UI, which already never calls this hook before a caller has picked one.
 */
export type RequestBudgetRefillArgs = {
  accountId: string;
  /**
   * Defaults to `accountId`. There is no separate "list my budget accounts" RPC in scope for
   * this ticket and, per ADR-0006, one account is one person -- so the caller's own account id
   * is the only budget-account identifier this screen has available. Pass an explicit value if a
   * future screen ever has one.
   */
  budgetAccountId?: string;
  /** Carried through but NOT used to scope the request -- budget is account-scoped, not project-scoped. */
  projectId?: string;
  /** Defaults to the current calendar month. */
  period?: string;
  idempotencyKey: string;
  /**
   * The amount the caller picked from `MyBudgetRefillLadder.allowedAmountsMicros` (ADR-0015).
   * Required as of lightbridge-authz#387 -- see the NOTE above this type. A raw micro-USD decimal
   * string, never a formatted display value.
   */
  requestedAmountMicros: string;
};

/**
 * Extracted from `useRequestBudgetRefill`'s `mutationFn` so it is callable directly in a test
 * without rendering the hook (this package has no React-hook-testing harness set up — see
 * `budget.test.ts`'s routing tests). Every one of the four functions below is `getBudgetRpcClient`-
 * routed, never `getAuthzRpcClient` -- these 4 op-ids, and the other 10 budget:*-gated procedures
 * alongside them, moved off `authz-api` onto `authz-budget` as a hard cutover
 * (lightbridge-authz#351); calling them through the CRUD client 404s.
 */
export async function requestBudgetRefill({
  accountId,
  budgetAccountId,
  projectId,
  period,
  idempotencyKey,
  requestedAmountMicros,
}: RequestBudgetRefillArgs): Promise<AugmentationRequest> {
  return getBudgetRpcClient().procedures.requestBudgetRefill({
    args: {
      accountId,
      budgetAccountId: budgetAccountId ?? accountId,
      projectId,
      period: period ?? currentBudgetPeriod(),
      idempotencyKey,
      requestedAmountMicros,
    },
  });
}

export function useRequestBudgetRefill() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: requestBudgetRefill,
    // A submitted refill can move the caller up a rung (or exhaust the unaided allowance) --
    // either way the ladder preview for THIS period is now stale the moment a decision comes
    // back, auto-approved or not (even a `pending_review` outcome consumed one of the two unaided
    // slots `refill_status` doesn't currently surface, so refetching is still the honest move).
    // Keyed off the response's own `period`, not the caller's local variable, since the request
    // always resolves to a concrete period server-side even when the caller omitted one.
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: myBudgetRefillLadderQueryKey(data.period) });
    },
  });

  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
    mutateAsync: mutation.mutateAsync,
  };
}

/** Bare prefix -- invalidating with this alone clears every `budgetAccountId` scoping. */
export const pendingAugmentationRequestsQueryKey = [
  'budget',
  'pending-augmentation-requests',
] as const;

export function pendingAugmentationRequestsListQueryKey(budgetAccountId?: string) {
  return [...pendingAugmentationRequestsQueryKey, budgetAccountId ?? 'all'] as const;
}

/**
 * `listPendingAugmentationRequests` now returns a paginated `{ entries, nextCursor }` shape
 * (lightbridge-authz#376, #296) instead of a flat array. This helper still returns a flat
 * `AugmentationRequest[]` -- callers here (the admin review screen) don't page through the queue
 * yet, so unwrapping `.entries` and dropping `nextCursor` keeps the existing call sites/tests
 * unchanged rather than threading pagination through a UI that doesn't use it. Revisit if/when
 * the review screen needs to page past the first `limit` results.
 */
export async function listPendingAugmentationRequests(
  budgetAccountId?: string
): Promise<AugmentationRequest[]> {
  const page = await getBudgetRpcClient().procedures.listPendingAugmentationRequests({
    args: { budgetAccountId },
  });
  return page.entries;
}

/**
 * The admin review queue's read path. `budgetAccountId` omitted (the default) lists the whole
 * cross-account queue -- this ticket's review screen is a global admin view, not scoped to one
 * account.
 */
export function usePendingAugmentationRequests(budgetAccountId?: string, enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: pendingAugmentationRequestsListQueryKey(budgetAccountId),
    queryFn: () => listPendingAugmentationRequests(budgetAccountId),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  return { ...query, data: query.data ?? [] };
}

export async function approveAugmentationRequest({
  requestId,
}: {
  requestId: string;
}): Promise<AugmentationRequest> {
  return getBudgetRpcClient().procedures.approveAugmentationRequest({ args: { requestId } });
}

export function useApproveAugmentationRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: approveAugmentationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAugmentationRequestsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export async function rejectAugmentationRequest({
  requestId,
  reason,
}: {
  requestId: string;
  reason: string;
}): Promise<AugmentationRequest> {
  return getBudgetRpcClient().procedures.rejectAugmentationRequest({ args: { requestId, reason } });
}

export function useRejectAugmentationRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: rejectAugmentationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendingAugmentationRequestsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}
