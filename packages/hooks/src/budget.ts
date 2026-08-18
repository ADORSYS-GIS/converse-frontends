import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { createId, getBudgetRpcClient } from '@lightbridge/authz-rpc';
import { useAuthSession } from './auth-session';
import { currentBudgetPeriod } from './budget-tiers';

export type { AugmentationRequest } from '@lightbridge/authz-rpc';

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

/**
 * NOTE ON THE MISSING `tier` ARGUMENT: `RequestBudgetRefillInput` (packages/authz-rpc/schema/
 * authz.cstack) has no field of any kind for the caller to specify which tier/amount they are
 * requesting -- confirmed by reading the schema directly (`budgetAccountId`, `accountId`,
 * `projectId?`, `period`, `idempotencyKey?` only). `AugmentationRequest.requestedTier` exists on
 * the RETURN type, but nothing on the INPUT lets a caller drive it. This mutation intentionally
 * does NOT accept a `tier` parameter as a result -- there is nowhere on the wire to put it, and
 * inventing an undeclared field to smuggle one across would be presenting an unverified
 * assumption as a real integration. See this ticket's implementation report for the full
 * write-up; the caller-selected tier is UI-only until `RequestBudgetRefillInput` gains a field
 * for it upstream.
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
}: RequestBudgetRefillArgs): Promise<AugmentationRequest> {
  return getBudgetRpcClient().procedures.requestBudgetRefill({
    args: {
      accountId,
      budgetAccountId: budgetAccountId ?? accountId,
      projectId,
      period: period ?? currentBudgetPeriod(),
      idempotencyKey,
    },
  });
}

export function useRequestBudgetRefill() {
  const mutation = useMutation({
    mutationFn: requestBudgetRefill,
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
