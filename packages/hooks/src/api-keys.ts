import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from '@lightbridge/api-rest';
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from '@lightbridge/api-rest';

export const apiKeysQueryKey = ['api-keys'] as const;

async function fetchApiKeys() {
  const items = await listApiKeys<true>();
  return items.data;
}

export function useApiKeys() {
  const query = useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: fetchApiKeys,
  });

  const items = useMemo<ApiKey[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
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
    mutationFn: async (input: CreateApiKeyInput) => createApiKey<true>({ body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });

  return {
    isPending: mutation.isPending,
    mutate: mutation.mutateAsync,
  };
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateApiKeyInput }) =>
      updateApiKey<true>({
        body: input,
        path: {
          id,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });

  return {
    isPending: mutation.isPending,
    mutate: mutation.mutateAsync,
  };
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => deleteApiKey({ path: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}
