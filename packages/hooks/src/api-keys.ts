import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiKeyBackendApiKey,
  ApiKeyBackendCreateApiKey,
  ApiKeyBackendRotateApiKey,
  ApiKeyBackendUpdateApiKey,
} from '@lightbridge/api-rest';
import {
  apiKeyBackendCreateApiKey,
  apiKeyBackendDeleteApiKey,
  apiKeyBackendListApiKeys,
  apiKeyBackendRevokeApiKey,
  apiKeyBackendRotateApiKey,
  apiKeyBackendUpdateApiKey,
} from '@lightbridge/api-rest';
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
      const response = await apiKeyBackendListApiKeys<true>({
        path: { project_id: projectId },
        query: { limit, offset },
      });
      return response.data;
    },
    enabled: !!projectId && isAuthenticated,
    // Keep the current page visible while the next one loads (no empty flash on paging).
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = useMemo<ApiKeyBackendApiKey[]>(() => query.data ?? [], [query.data]);

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

  const item = useMemo<ApiKeyBackendApiKey | undefined>(() => {
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
      input: ApiKeyBackendCreateApiKey;
      projectId: string;
    }) => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await apiKeyBackendCreateApiKey<true>({
        path: { project_id: projectId },
        body: input,
      });
      return response.data;
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
      input: ApiKeyBackendUpdateApiKey;
    }) =>
      apiKeyBackendUpdateApiKey<true>({
        body: input,
        path: {
          key_id: id,
        },
      }),
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
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const response = await apiKeyBackendRevokeApiKey<true>({ path: { key_id: id } });
      return response.data;
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
    mutationFn: async ({
      id,
      input = {},
    }: {
      id: string;
      projectId: string;
      input?: ApiKeyBackendRotateApiKey;
    }) => {
      const response = await apiKeyBackendRotateApiKey<true>({
        path: { key_id: id },
        body: input,
      });
      return response.data;
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

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) =>
      apiKeyBackendDeleteApiKey({ path: { key_id: id } }),
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
