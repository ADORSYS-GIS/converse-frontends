import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiKeyBackendAccount, ApiKeyBackendUpdateAccount } from '@lightbridge/api-rest';
import {
  apiKeyBackendAddAccountMember,
  apiKeyBackendCreateAccount,
  apiKeyBackendDeleteAccount,
  apiKeyBackendDisableAccount,
  apiKeyBackendEnableAccount,
  apiKeyBackendListAccounts,
  apiKeyBackendRemoveAccountMember,
  apiKeyBackendUpdateAccount,
} from '@lightbridge/api-rest';
import { useAuthSession } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const response = await apiKeyBackendListAccounts<true>({
        path: { limit: 10, offset: 0 },
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

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ApiKeyBackendUpdateAccount }) => {
      const response = await apiKeyBackendUpdateAccount<true>({
        path: { account_id: id },
        body: input,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDisableAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await apiKeyBackendDisableAccount<true>({
        path: { account_id: id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useEnableAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await apiKeyBackendEnableAccount<true>({
        path: { account_id: id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useAddAccountMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, subject }: { id: string; subject: string }) => {
      const response = await apiKeyBackendAddAccountMember<true>({
        path: { account_id: id },
        body: { subject },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useRemoveAccountMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, subject }: { id: string; subject: string }) => {
      const response = await apiKeyBackendRemoveAccountMember<true>({
        path: { account_id: id, member: subject },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    error: mutation.error,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      apiKeyBackendDeleteAccount({ path: { account_id: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    },
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync,
  };
}

export function useEnsureDefaultAccount() {
  const queryClient = useQueryClient();
  const { session } = useAuthSession();

  const mutation = useMutation({
    mutationFn: async () => {
      const accountsResponse = await apiKeyBackendListAccounts<true>({
        path: { limit: 10, offset: 0 },
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
