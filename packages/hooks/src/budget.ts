import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { createId, getAuthzRpcClient } from '@lightbridge/authz-rpc';
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

export function useRequestBudgetRefill() {
  const mutation = useMutation({
    mutationFn: async ({
      accountId,
      budgetAccountId,
      projectId,
      period,
      idempotencyKey,
    }: RequestBudgetRefillArgs): Promise<AugmentationRequest> =>
      getAuthzRpcClient().procedures.requestBudgetRefill({
        args: {
          accountId,
          budgetAccountId: budgetAccountId ?? accountId,
          projectId,
          period: period ?? currentBudgetPeriod(),
          idempotencyKey,
        },
      }),
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
export const pendingAugmentationRequestsQueryKey = ['budget', 'pending-augmentation-requests'] as const;

export function pendingAugmentationRequestsListQueryKey(budgetAccountId?: string) {
  return [...pendingAugmentationRequestsQueryKey, budgetAccountId ?? 'all'] as const;
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
    queryFn: async (): Promise<AugmentationRequest[]> =>
      getAuthzRpcClient().procedures.listPendingAugmentationRequests({
        args: { budgetAccountId },
      }),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  return { ...query, data: query.data ?? [] };
}

export function useApproveAugmentationRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }): Promise<AugmentationRequest> =>
      getAuthzRpcClient().procedures.approveAugmentationRequest({ args: { requestId } }),
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

export function useRejectAugmentationRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }): Promise<AugmentationRequest> =>
      getAuthzRpcClient().procedures.rejectAugmentationRequest({ args: { requestId, reason } }),
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
