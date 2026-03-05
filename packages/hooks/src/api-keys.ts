import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ApiKeyBackendApiKey,
  ApiKeyBackendCreateApiKey,
  ApiKeyBackendUpdateApiKey,
} from '@lightbridge/api-rest';
import {
  apiKeyBackendCreateApiKey,
  apiKeyBackendDeleteApiKey,
  apiKeyBackendListApiKeys,
  apiKeyBackendUpdateApiKey,
} from '@lightbridge/api-rest';
import { useCurrentProject } from './projects';
import { useAuthReady } from './auth-session';

export function apiKeysQueryKey(projectId: string) {
  return ['projects', projectId, 'api-keys'] as const;
}

export function useApiKeys(projectIdOverride?: string) {
  const { data: currentProject } = useCurrentProject(!projectIdOverride);
  const projectId = projectIdOverride ?? currentProject?.id;
  const authReady = useAuthReady();

  const query = useQuery({
    queryKey: projectId ? apiKeysQueryKey(projectId) : ['projects', 'unknown', 'api-keys'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await apiKeyBackendListApiKeys<true>({
        path: { project_id: projectId, limit: 10, offset: 0 },
      });
      return response.data;
    },
    enabled: !!projectId && authReady,
  });

  const items = useMemo<ApiKeyBackendApiKey[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
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
