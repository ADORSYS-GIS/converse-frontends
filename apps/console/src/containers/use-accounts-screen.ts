'use client';

import type { AccountDirectoryProps } from '@lightbridge/ui-web/src/sections/account-directory';
import { useRouter } from 'next/navigation';

import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { useOpenCreateAccountDialog } from './use-create-account-dialog';

/**
 * `/settings/accounts` — the accounts list's data adapter (IA v3 phase E, owner: "add
 * /settings/accounts"). The SAME identity's account family the workspace switcher already reads
 * (`useConsoleScope().allAccounts`) — this screen adds no query of its own, it only reshapes the
 * existing scope query into `AccountDirectoryRow[]` and wires row navigation.
 *
 * Account CREATION lives here now, not `/settings/policies` (owner: "there's no sense in having
 * account or project creation" on the policies screen) — `onCreate` opens the SAME shared,
 * cross-route `AccountNameDialog` instance every other trigger opens
 * (`use-create-account-dialog.ts`, mounted once in `app/(console)/layout.tsx`).
 */
export interface AccountsScreen {
  directory: AccountDirectoryProps;
  accountCount: number;
}

export function useAccountsScreen(): AccountsScreen {
  const scope = useConsoleScope();
  const router = useRouter();
  const openCreateAccount = useOpenCreateAccountDialog();

  const accounts = scope.allAccounts.map((account) => ({
    id: account.id,
    label: accountScopeLabel(account),
    status: account.status,
    defaultQuotaTier: account.defaultQuota ?? null,
  }));

  const directory: AccountDirectoryProps = {
    accounts,
    loading: scope.loading,
    error: scope.error ? 'Could not load your accounts.' : undefined,
    onRetry: () => scope.refetch(),
    onCreate: openCreateAccount,
    onSelectAccount: (accountId) => router.push(`/settings/accounts/${accountId}`),
  };

  return { directory, accountCount: accounts.length };
}
