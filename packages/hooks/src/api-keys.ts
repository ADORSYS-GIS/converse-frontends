import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from '@lightbridge/authz-rpc';
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
} from '@lightbridge/authz-rpc';
import { useCurrentProject } from './projects';
import { useAuthSession } from './auth-session';

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
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      return listApiKeys({ limit, offset, filters: [{ key: 'projectId', value: projectId }] });
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
      return createApiKey({ ...input, projectId });
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
    }) => updateApiKey(id, input),
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
    mutationFn: async ({ id }: { id: string; projectId: string }) => revokeApiKey({ keyId: id }),
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
    mutationFn: async ({ id }: { id: string; projectId: string }) => rotateApiKey({ keyId: id }),
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
    mutationFn: async ({ id }: { id: string; projectId: string }) => deleteApiKey(id),
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
