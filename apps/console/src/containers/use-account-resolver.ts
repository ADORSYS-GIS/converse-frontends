'use client';

import type { Account } from '@lightbridge/authz-rpc';
import { useList } from '@refinedev/core';

/** `localStorage` key the resolver reads/writes — also written by `console-chrome.tsx`'s
 *  workspace switcher on every manual account switch (item 7), so the preference always reflects
 *  wherever the visitor was last, not just where the resolver last sent them. */
export const LAST_ACCOUNT_STORAGE_KEY = 'lightbridge.last-account';

/** Best-effort read: private browsing, a cleared store, or a disabled `localStorage` all throw
 *  rather than returning `null` in some browsers — treated identically to "no preference on
 *  file" either way, never a hard failure. */
export function readLastAccountId(): string | null {
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Best-effort write — same try/catch contract as the read above. */
export function writeLastAccountId(accountId: string): void {
  try {
    window.localStorage.setItem(LAST_ACCOUNT_STORAGE_KEY, accountId);
  } catch {
    // Nothing to recover: the console still works with no remembered preference, it just falls
    // back to "first account" on the next visit.
  }
}

export interface AccountResolverResult {
  loading: boolean;
  error: boolean;
  retry: () => void;
  accounts: Account[];
  /**
   * The account a bare `/` should redirect to, once resolvable. `null` while the query is still
   * loading or has failed (never a fabricated guess) AND once it has settled on genuinely zero
   * accounts — the caller renders the first-run create-account surface in that last case, not a
   * redirect to nowhere.
   */
  targetAccountId: string | null;
}

const RESOLVER_PAGE_SIZE = 100;

/**
 * `/`'s own data adapter (IA v3 phase 1, "account into the path") — resolves which account a bare
 * visit to the console should land on, without ever writing that choice into a URL param (ADR
 * 0011 Decision 5): the resolution lives in a redirect target, not in `?account=`.
 *
 * Preference order: the `lightbridge.last-account` `localStorage` entry — set here and by the
 * workspace switcher's own account switch (`console-chrome.tsx`) — when it names an account the
 * caller still has; otherwise the first account the backend returns. Both are equally "real":
 * neither is fabricated, both come from the settled `model.Account.list` response this hook reads
 * exactly once via `useList`.
 */
export function useAccountResolver(): AccountResolverResult {
  const accountsQuery = useList<Account>({
    resource: 'accounts',
    pagination: { currentPage: 1, pageSize: RESOLVER_PAGE_SIZE },
  });

  const accounts = accountsQuery.result.data;
  const loading = accountsQuery.query.isLoading;
  const error = accountsQuery.query.isError;
  const settled = !loading && !error;

  let targetAccountId: string | null = null;
  if (settled && accounts.length > 0) {
    const lastAccountId = readLastAccountId();
    const remembered = lastAccountId
      ? accounts.find((account) => account.id === lastAccountId)
      : undefined;
    targetAccountId = (remembered ?? accounts[0]).id;
  }

  return {
    loading,
    error,
    retry: () => void accountsQuery.query.refetch(),
    accounts,
    targetAccountId,
  };
}
