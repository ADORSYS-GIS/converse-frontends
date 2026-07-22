import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateAccountInput } from '@lightbridge/authz-rpc';
import { getAuthzRpcClient } from '@lightbridge/authz-rpc';
import { type Account, asFull } from './authz-types';
import { useAuthSession } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const page = await getAuthzRpcClient().accounts.list({ limit: 10, offset: 0 });
      return page.items.map((account) => asFull<Account>(account));
    },
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Account[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

export function useCurrentAccount(enabled = true) {
  const { isAuthenticated } = useAuthSession();
  const { data, ...query } = useAccounts(enabled);

  const current = useMemo<Account | undefined>(() => {
    return data && data.length > 0 ? data[0] : undefined;
  }, [data]);

  return { ...query, data: current, enabled: enabled && isAuthenticated };
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      asFull<Account>(await getAuthzRpcClient().accounts.update(id, input)),
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
    mutationFn: async ({ id }: { id: string }) =>
      asFull<Account>(
        await getAuthzRpcClient().procedures.disableAccount({ args: { accountId: id } })
      ),
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
    mutationFn: async ({ id }: { id: string }) =>
      asFull<Account>(
        await getAuthzRpcClient().procedures.enableAccount({ args: { accountId: id } })
      ),
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
    mutationFn: async ({ id, subject }: { id: string; subject: string }) =>
      asFull<Account>(
        await getAuthzRpcClient().procedures.addAccountMember({ args: { accountId: id, subject } })
      ),
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
    mutationFn: async ({ id, subject }: { id: string; subject: string }) =>
      asFull<Account>(
        await getAuthzRpcClient().procedures.removeAccountMember({
          args: { accountId: id, subject },
        })
      ),
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
    mutationFn: async ({ id }: { id: string }) => getAuthzRpcClient().accounts.delete(id),
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
      const existing = await getAuthzRpcClient().accounts.list({ limit: 10, offset: 0 });

      if (existing.items.length > 0) {
        return asFull<Account>(existing.items[0]);
      }

      if (!session.user) {
        throw new Error('User session is required to create a default account');
      }

      const billingIdentity = session.user.email ?? session.user.name ?? session.user.id;

      const created = await getAuthzRpcClient().procedures.createAccount({
        args: { billingIdentity },
      });

      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      return asFull<Account>(created);
    },
  });

  return {
    ...mutation,
    mutate: mutation.mutateAsync,
  };
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ billingIdentity }: { billingIdentity: string }) =>
      asFull<Account>(
        await getAuthzRpcClient().procedures.createAccount({ args: { billingIdentity } })
      ),
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
