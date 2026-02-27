import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiKeyBackendAccount } from '@lightbridge/api-rest';
import { apiKeyBackendCreateAccount, apiKeyBackendListAccounts } from '@lightbridge/api-rest';
import { useAuthSession, getAuthReady } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts(enabled = true) {
  const authReady = getAuthReady();

  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const response = await apiKeyBackendListAccounts<true>();
      return response.data;
    },
    enabled: enabled && authReady,
  });

  const items = useMemo<ApiKeyBackendAccount[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentAccount(enabled = true) {
  const { data, ...query } = useAccounts(enabled);

  const current = useMemo<ApiKeyBackendAccount | undefined>(() => {
    return data && data.length > 0 ? data[0] : undefined;
  }, [data]);

  return { ...query, data: current };
}

export function useEnsureDefaultAccount() {
  const queryClient = useQueryClient();
  const { session } = useAuthSession();

  const mutation = useMutation({
    mutationFn: async () => {
      const accountsResponse = await apiKeyBackendListAccounts<true>();
      const existing = accountsResponse.data;

      if (existing && existing.length > 0) {
        return existing[0];
      }

      if (!session.user) {
        throw new Error('User session is required to create a default account');
      }

      const billingIdentity = session.user.email ?? session.user.name ?? session.user.id;
      const ownerAdmin = session.user.email ?? session.user.id;

      const createResponse = await apiKeyBackendCreateAccount<true>({
        body: {
          billing_identity: billingIdentity,
          owners_admins: [ownerAdmin],
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
