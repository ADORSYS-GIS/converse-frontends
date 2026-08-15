import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateAccountInput } from '@lightbridge/authz-rpc';
import { getAuthzRpcClient } from '@lightbridge/authz-rpc';
import type { Account } from './authz-types';
import { useAuthSession } from './auth-session';

export const accountsQueryKey = ['accounts'] as const;

export type UseAccountsOptions = {
  offset?: number;
  limit?: number;
};

/** Applies the default page (offset 0, limit 10 — matches the backend list default). */
export function resolveAccountsOptions(
  options: UseAccountsOptions = {}
): Required<UseAccountsOptions> {
  return { offset: options.offset ?? 0, limit: options.limit ?? 10 };
}

/**
 * Per-page query key — the bare `accountsQueryKey` prefix with `{ offset, limit }` appended
 * on top (same pattern as `apiKeysQueryKey` in api-keys.ts). Invalidating with the bare
 * prefix still clears every cached page.
 */
export function accountsListQueryKey(options: UseAccountsOptions = {}) {
  return [...accountsQueryKey, resolveAccountsOptions(options)] as const;
}

export function useAccounts(enabled = true, options: UseAccountsOptions = {}) {
  const { isAuthenticated } = useAuthSession();

  const { offset, limit } = resolveAccountsOptions(options);

  const query = useQuery({
    queryKey: accountsListQueryKey(options),
    queryFn: async (): Promise<Account[]> => {
      const page = await getAuthzRpcClient().accounts.list({ limit, offset });
      return page.items;
    },
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Account[]>(() => query.data ?? [], [query.data]);

  return { ...query, data: items };
}

/** Rows per request while paging through the complete account list — see {@link fetchAllAccounts}. */
const ALL_ACCOUNTS_PAGE_SIZE = 50;
/**
 * Safety ceiling on {@link fetchAllAccounts}'s "keep paging" loop: large enough that no real
 * account list should ever hit it (ADR-0006: one account is one person — ergo the account list
 * response the caller sees is realistically always 0 or 1 rows), small enough that a server bug
 * returning `hasNextPage: true` forever cannot turn this into an unbounded fetch loop.
 */
const MAX_ACCOUNTS_PAGES = 20;

/**
 * Pages through `accounts.list` until the server reports no more (`pageInfo.hasNextPage: false`),
 * accumulating every item. Backs `useAllAccounts` below — the account picker needs the *complete*
 * list to search over, not a first page capped at `resolveAccountsOptions`'s default `limit: 10`
 * (the truncation this whole hook exists to avoid; see `useAllProjects` in ./projects for the
 * same pattern applied to the list that actually grows past one page in practice).
 */
export async function fetchAllAccounts(): Promise<{ items: Account[]; totalCount: number }> {
  let items: Account[] = [];
  let offset = 0;
  let totalCount = 0;

  for (let pageIndex = 0; pageIndex < MAX_ACCOUNTS_PAGES; pageIndex += 1) {
    const page = await getAuthzRpcClient().accounts.list({
      limit: ALL_ACCOUNTS_PAGE_SIZE,
      offset,
    });
    items = items.concat(page.items);
    totalCount = page.totalCount ?? items.length;

    if (!page.pageInfo.hasNextPage) {
      return { items, totalCount };
    }
    offset += ALL_ACCOUNTS_PAGE_SIZE;
  }

  return { items, totalCount };
}

/** Query key for the complete-list fetch — nested under `accountsQueryKey` so invalidating that
 *  bare prefix (every mutation below already does) clears this cache too. */
export function allAccountsQueryKey() {
  return [...accountsQueryKey, 'all'] as const;
}

/**
 * The complete account list — every page, not just the first. Feeds the account picker
 * (`EntityPickerField` in apps/self-service), which needs to search/select over every account the
 * caller has, not just the first `limit: 10` of them. Prefer `useAccounts` for anything that
 * intentionally wants one page (e.g. an existence check).
 */
export function useAllAccounts(enabled = true) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: allAccountsQueryKey(),
    queryFn: fetchAllAccounts,
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const items = useMemo<Account[]>(() => query.data?.items ?? [], [query.data]);
  const totalCount = query.data?.totalCount ?? items.length;

  return { ...query, data: items, totalCount };
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
    // Deliberately NOT threaded through UseAccountsOptions/pagination: this is an internal
    // "does the caller already have an account" existence check (one account per JWT subject
    // per ADR-0006, so `limit: 10` is already far more than the model allows), not a
    // user-facing list. It only ever reads `existing.items[0]`, so a variable offset/limit
    // would be meaningless here — leave it hardcoded.
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
