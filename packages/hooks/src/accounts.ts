import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiKeyBackendAccount } from '@lightbridge/api-rest';
import { apiKeyBackendCreateAccount, apiKeyBackendListAccounts } from '@lightbridge/api-rest';
import { useAuthSession } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const response = await apiKeyBackendListAccounts<true>({
        query: { limit: 10, offset: 0 },
      });
      return response.data;
    },
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<ApiKeyBackendAccount[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentAccount(enabled = true) {
  const { isAuthenticated } = useAuthSession();
  const { data, ...query } = useAccounts(enabled);

  const current = useMemo<ApiKeyBackendAccount | undefined>(() => {
    return data && data.length > 0 ? data[0] : undefined;
  }, [data]);

  return { ...query, data: current, enabled: enabled && isAuthenticated };
}

export function useEnsureDefaultAccount() {
  const queryClient = useQueryClient();
  const { session } = useAuthSession();

  const mutation = useMutation({
    mutationFn: async () => {
      const accountsResponse = await apiKeyBackendListAccounts<true>({
        query: { limit: 10, offset: 0 },
      });
      const existing = accountsResponse.data;

      if (existing && existing.length > 0) {
        return existing[0];
      }

      if (!session.user) {
        throw new Error('User session is required to create a default account');
      }

      const billingIdentity = session.user.email ?? session.user.name ?? session.user.id;

      const createResponse = await apiKeyBackendCreateAccount<true>({
        body: {
          billing_identity: billingIdentity,
        },
      });

      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      return createResponse.data;
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}
