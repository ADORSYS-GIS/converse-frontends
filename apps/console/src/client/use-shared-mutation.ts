'use client';

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import type { MutationKey } from '@tanstack/react-query';

/**
 * A mutation whose **result** is visible to every zone, not just to the component that fired it.
 *
 * ADR 0011 leaves the console with exactly three homes for state: the URL (view state), the query
 * cache (server state), and a sanctioned local `useState` (ephemeral interaction). The things this
 * hook exists for belong to the first not at all and to the third not at all — they are *mutation
 * outcomes*:
 *
 *  - the one-time secret returned by `createApiKey`/`rotateApiKey`, which must **never** reach a
 *    URL or the browser's history,
 *  - the reason a revoke, a refill decision, or an unwired action failed,
 *
 * and each of them is produced in one zone and rendered in another. `+ New key` lives in the
 * `@rail` slot while the secret it returns is rendered by the ledger in the centre; a refill
 * decision is submitted from whichever zone is showing the review panel while its failure has to
 * surface on the centre's queue. Centre and rail are separate route segments in separate React
 * subtrees, so each gets its own `useMutation` instance and one instance's `isError`/`data` is
 * invisible to the other. Before ADR 0011 that gap was bridged by copying the outcome into the
 * layout's view-state provider — the provider this ADR deletes.
 *
 * The bridge that survives is the one that was already there: the **`MutationCache`** is a single
 * shared object on the `QueryClient` both zones already use. Writing through `useMutation` with an
 * explicit `mutationKey` and reading back through `useMutationState` means every zone observes the
 * same outcome without any state of our own — and `dismiss()` evicts the entry from that cache, so
 * dismissing the secret in the centre also clears it for the rail.
 *
 * `mutationKey` must be a **module-level constant**, not an inline literal: it is the identity two
 * zones agree on, and it is matched structurally by `findAll`/`useMutationState`.
 */

export interface SharedMutationState<TData> {
  data: TData | undefined;
  /** The failure reason, already flattened to a message the inline error line can render. */
  errorMessage: string | undefined;
  isPending: boolean;
}

export interface SharedMutation<TVariables, TData> extends SharedMutationState<TData> {
  mutate: (variables: TVariables) => void;
  /** Evicts the outcome from the shared cache — for every zone at once, not just this one. */
  dismiss: () => void;
}

export function useSharedMutation<TVariables, TData>({
  mutationKey,
  mutationFn,
  onSuccess,
}: {
  mutationKey: MutationKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
}): SharedMutation<TVariables, TData> {
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationKey, mutationFn, onSuccess });
  const shared = useSharedMutationState<TData>(mutationKey);

  return {
    ...shared,
    mutate: (variables) => mutation.mutate(variables),
    dismiss: () => {
      const cache = queryClient.getMutationCache();
      for (const entry of cache.findAll({ mutationKey, exact: true })) cache.remove(entry);
      // The observer in THIS zone keeps its own copy of the outcome after the cache entry is gone;
      // resetting it stops a later re-render from re-reporting what was just dismissed.
      mutation.reset();
    },
  };
}

/**
 * Reads the shared outcome without owning a mutation — for a zone that only renders it, and for
 * the `dismiss`-only paths.
 */
export function useSharedMutationState<TData>(
  mutationKey: MutationKey
): SharedMutationState<TData> {
  // The CACHE, not a `useMutation` instance: the instance that fired it is usually in another zone.
  const states = useMutationState({
    filters: { mutationKey, exact: true },
    select: (entry) => entry.state,
  });
  const latest = states.at(-1);

  return {
    data: latest?.data as TData | undefined,
    errorMessage: latest?.error ? messageOf(latest.error) : undefined,
    isPending: latest?.status === 'pending',
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
