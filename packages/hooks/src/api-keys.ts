import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BillingPlanInfo, CreateApiKeyInput, UpdateApiKeyInput } from '@lightbridge/authz-rpc';
import { getAuthzRpcClient } from '@lightbridge/authz-rpc';
import type { ApiKey } from './authz-types';
import { useCurrentProject } from './projects';
import { useAuthSession } from './auth-session';

/** Query key for the operator-configured billing-plan catalogue (`procedure.listBillingPlans`).
 * Not project- or account-scoped -- the catalogue is server config, the same for every caller who
 * can reach it. */
export const BILLING_PLANS_QUERY_KEY = ['billing-plans'] as const;

/**
 * Base query key for a project's API keys — the invalidation prefix. The per-page
 * `useQuery` key appends `{ offset, limit }` on top of this, so invalidating with the
 * bare prefix clears every cached page at once.
 */
export function apiKeysQueryKey(projectId: string) {
  return ['projects', projectId, 'api-keys'] as const;
}

export type UseApiKeysOptions = {
  offset?: number;
  limit?: number;
};

export function useApiKeys(projectIdOverride?: string, options: UseApiKeysOptions = {}) {
  const { data: currentProject, isLoading: isProjectLoading } =
    useCurrentProject(!projectIdOverride);
  const projectId = projectIdOverride ?? currentProject?.id;
  const { isAuthenticated } = useAuthSession();

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 10;

  const query = useQuery({
    queryKey: projectId
      ? [...apiKeysQueryKey(projectId), { offset, limit }]
      : ['projects', 'unknown', 'api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      if (!projectId) throw new Error('Project ID is required');
      const page = await getAuthzRpcClient().apiKeys.list({
        limit,
        offset,
        filters: [{ key: 'projectId', value: projectId }],
      });
      return page.items;
    },
    enabled: !!projectId && isAuthenticated,
    // Keep the current page visible while the next one loads (no empty flash on paging).
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = useMemo<ApiKey[]>(() => query.data ?? [], [query.data]);

  return {
    ...query,
    data: items,
    // Prevent an empty-state flash while the project id is still resolving.
    isLoading: isProjectLoading || query.isLoading,
  };
}

// TODO We cannot get a full list just to take a single item
export function useApiKey(id?: string | null) {
  const { data, ...query } = useApiKeys();

  const item = useMemo<ApiKey | undefined>(() => {
    if (!id) {
      return undefined;
    }
    return data.find((entry) => entry.id === id);
  }, [data, id]);

  return { ...query, data: item };
}

/**
 * The operator-configured billing-plan catalogue `createApiKey`'s `billingPlan` is validated
 * against server-side (`procedure.listBillingPlans` -- see `AuthzStoreImpl::billing_plans` in the
 * backend). This is config, not per-project data, so it needs no `projectId`, but it still
 * requires a caller (`listBillingPlans` is gated at the same `apikey:create` permission as
 * `createApiKey` itself) -- a caller lacking that permission gets a `403`, surfaced as
 * `query.error` like any other failed query, which callers should render as "plan selection
 * unavailable" rather than treating it as "no plans configured" (an empty, successful `[]` is the
 * latter).
 *
 * `enabled` lets a caller skip the fetch entirely when it has no use for the result yet -- e.g.
 * `ApiKeyCreateScreen` only needs the catalogue once it knows the caller may pick a plan at all
 * (`canChoosePlan`), so it passes that straight through rather than always fetching and throwing
 * the response away.
 */
export function useBillingPlans(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  return useQuery<BillingPlanInfo[]>({
    queryKey: BILLING_PLANS_QUERY_KEY,
    queryFn: () => getAuthzRpcClient().procedures.listBillingPlans({ args: {} }),
    enabled: isAuthenticated && enabled,
    // The catalogue is operator config, reloaded only on a redeploy -- stale for a full session is
    // fine, and avoids a refetch on every create-key screen visit.
    staleTime: 5 * 60_000,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      input,
      projectId,
    }: {
      input: Omit<CreateApiKeyInput, 'projectId'>;
      projectId: string;
    }) => {
      if (!projectId) throw new Error('Project ID is required');
      return getAuthzRpcClient().procedures.createApiKey({ args: { ...input, projectId } });
    },
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) });
      }
    },
  });

  return {
    isPending: mutation.isPending,
    mutate: mutation.mutateAsync,
  };
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      projectId: string;
      input: UpdateApiKeyInput;
    }): Promise<ApiKey> => getAuthzRpcClient().apiKeys.update(id, input),
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) });
      }
    },
  });

  return {
    isPending: mutation.isPending,
    mutate: mutation.mutateAsync,
  };
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }): Promise<ApiKey> =>
      getAuthzRpcClient().procedures.revokeApiKey({ args: { keyId: id } }),
    onMutate: async ({ id, projectId }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: apiKeysQueryKey(projectId) });

      // Snapshot all cached pages for rollback.
      const previousPages = queryClient.getQueriesData<ApiKey[]>({
        queryKey: [...apiKeysQueryKey(projectId)],
      });

      // Optimistically mark the key as revoked in every cached page.
      queryClient.setQueriesData<ApiKey[]>({ queryKey: [...apiKeysQueryKey(projectId)] }, (old) => {
        if (!old) return old;
        return old.map((key) =>
          key.id === id
            ? { ...key, status: 'revoked' as const, revokedAt: new Date().toISOString() }
            : key
        );
      });

      return { previousPages };
    },
    onError: (_err, { projectId }, context) => {
      // Roll back to the snapshot on failure.
      if (context?.previousPages) {
        for (const [queryKey, data] of context.previousPages) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) });
      }
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useRotateApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) =>
      getAuthzRpcClient().procedures.rotateApiKey({ args: { keyId: id } }),
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) });
      }
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) =>
      getAuthzRpcClient().apiKeys.delete(id),
    onMutate: async ({ id, projectId }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: apiKeysQueryKey(projectId) });

      // Snapshot all cached pages for rollback.
      const previousPages = queryClient.getQueriesData<ApiKey[]>({
        queryKey: [...apiKeysQueryKey(projectId)],
      });

      // Optimistically remove the key from every cached page.
      queryClient.setQueriesData<ApiKey[]>({ queryKey: [...apiKeysQueryKey(projectId)] }, (old) => {
        if (!old) return old;
        return old.filter((key) => key.id !== id);
      });

      return { previousPages };
    },
    onError: (_err, { projectId }, context) => {
      // Roll back to the snapshot on failure.
      if (context?.previousPages) {
        for (const [queryKey, data] of context.previousPages) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) });
      }
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}
