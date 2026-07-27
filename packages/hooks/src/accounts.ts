import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateAccountInput } from '@lightbridge/authz-rpc';
import { getAuthzRpcClient } from '@lightbridge/authz-rpc';
import type { Account } from './authz-types';
import { useAuthSession } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async (): Promise<Account[]> => {
      const page = await getAuthzRpcClient().accounts.list({ limit: 10, offset: 0 });
      return page.items;
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
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAccountInput;
    }): Promise<Account> => getAuthzRpcClient().accounts.update(id, input),
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
    mutationFn: async ({ id }: { id: string }): Promise<Account> =>
      getAuthzRpcClient().procedures.disableAccount({ args: { accountId: id } }),
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
    mutationFn: async ({ id }: { id: string }): Promise<Account> =>
      getAuthzRpcClient().procedures.enableAccount({ args: { accountId: id } }),
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

// useSetDefaultAccount, useAddAccountMember and useRemoveAccountMember were removed with
// lightbridge-authz ADR-0006. There is no account-level membership any more (one account is one
// person, keyed by the caller's JWT subject), so there is no roster to manage and no second account
// to default away from. The equivalents now live at the project level — see the roster procedures
// in packages/hooks/src/projects.ts.

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // model.Account.delete is now unconditionally RBAC-denied server-side — account
    // deletion is owner-only and goes exclusively through this procedure, which the
    // generic policy predicate can't express (see the schema's own Account/AccountMembership
    // doc comments for why: a compound "member row matching my subject AND role=owner"
    // check isn't expressible as a single @@allow relation-quantifier).
    mutationFn: async ({ id }: { id: string }): Promise<Account> =>
      getAuthzRpcClient().procedures.deleteAccountPermanently({ args: { accountId: id } }),
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
    mutationFn: async (): Promise<Account> => {
      const existing = await getAuthzRpcClient().accounts.list({ limit: 10, offset: 0 });

      if (existing.items.length > 0) {
        return existing.items[0];
      }

      if (!session.user) {
        throw new Error('User session is required to create a default account');
      }

      // No arguments carry identity any more: the server keys the account on the caller's JWT
      // subject (ADR-0006), so this is a pure "materialise my account" call. `billingIdentity`
      // moved to the project — see buildCreateProjectInput in ./projects.
      const created = await getAuthzRpcClient().procedures.createAccount({
        args: {},
      });

      queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      return created;
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
    // Takes no arguments: one account per person, keyed server-side on the JWT subject. A second
    // call for the same subject is a Conflict, not a second account.
    mutationFn: async (): Promise<Account> =>
      getAuthzRpcClient().procedures.createAccount({ args: {} }),
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
