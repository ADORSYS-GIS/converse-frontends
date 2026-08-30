'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
// Subpath imports, not the package barrel — see `use-settings-screen.ts`'s own note (this file's
// predecessor) on why, still true: several `ui-web` agents work in parallel, and for TYPE-only
// imports the choice is free (they erase at compile time).
import type {
  AccountNameDialogMode,
  AccountNameDialogProps,
} from '@lightbridge/ui-web/src/components/account-name-dialog';
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import { useList } from '@refinedev/core';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { SETTINGS_DIALOG_OPTIONS, useSettingsParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import {
  buildCreateAccountInput,
  buildUpdateAccountNameInput,
  normalizeAccountName,
} from './build-create-account-input';
import { classifyCreateAccountError } from './rpc-field-error';

/**
 * `/settings/account` — the account identity screen's data adapter, shared by its centre
 * (`account-settings-centre.tsx`) and the horizontal `SettingsSubNav` above it (for the
 * `Projects` tab's own trailing count).
 *
 * The split from the old, single `use-settings-screen.ts` (phase 6, admin/settings revamp — Attio
 * pattern, real routes) mirrors the route split: `/settings` redirects to `/settings/account`,
 * and `/settings/projects` is a genuinely separate route with its own data now, not a second
 * section stacked under the same header. This hook owns exactly the account-identity half —
 * `ownAccount`, `createAccount`/`updateAccountName`, and the dialog that drives both.
 *
 * `projectCount` is a lightweight `pageSize: 1` listing purely for the tab's own trailing count
 * (`use-projects-screen.ts`'s own `projects` query in `use-overview-screen.ts` uses the identical
 * pattern) — the full, paginated project list lives in `use-project-settings-screen.ts` instead.
 */

export interface AccountSettingsScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle`. */
  scopeLabel: string | undefined;
  accountSettings: AccountSettingsProps;
  accountNameDialog: AccountNameDialogProps;
  /** The account's project count, for `SettingsSubNav`'s `Projects` tab. */
  projectCount: number;
}

/** One key for both account writes: `createAccount` and `updateAccountName` are never available
 *  at once, so they cannot be in flight simultaneously, and sharing the key means the one
 *  `AccountNameDialog` reads one `submitting`/`errorMessage` pair regardless of which it drives. */
const ACCOUNT_NAME_MUTATION_KEY = ['settings', 'account-name'];

export function useAccountSettingsScreen(): AccountSettingsScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const [view, setView] = useSettingsParams();

  const projectCountList = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.accountId
      ? [{ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId }]
      : [],
  });

  /**
   * The signed-in principal's OWN account, matched on `sub` rather than the scoped `?account=`
   * id — `accounts.id` IS the JWT subject (ADR-0006), so this is the only account
   * `createAccount`/`updateAccountName` could ever target.
   */
  const ownAccount: Account | null =
    scope.allAccounts.find((account) => account.id === session.user?.sub) ?? null;
  const accountMode: AccountNameDialogMode = ownAccount === null ? 'create' : 'rename';

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the account dialog's typed-but-unsent name. `?account-name=true`
   * — WHETHER the dialog is showing — is real view state and lives in the URL; this is its
   * CONTENTS.
   */
  const [accountNameDraft, setAccountNameDraft] = useState('');

  let createAccountEligible: boolean;
  let createAccountReason: string | undefined;
  if (!session.user) {
    createAccountEligible = false;
    createAccountReason = 'Sign in to create an account.';
  } else if (ownAccount !== null) {
    // `createAccount` is `Error::Conflict` for a subject that already holds one, never an upsert.
    createAccountEligible = false;
    createAccountReason = 'This identity already has an account.';
  } else {
    createAccountEligible = true;
    createAccountReason = undefined;
  }

  const accountAction = useSharedMutation<{ mode: AccountNameDialogMode; name: string }, Account>({
    mutationKey: ACCOUNT_NAME_MUTATION_KEY,
    mutationFn: async ({ mode, name }) => {
      // Guards, not UI branches — `canSubmitAccountName` already keeps the dialog's own primary
      // disabled in each of these cases; this only fires against a caller bypassing the dialog.
      if (mode === 'create') {
        if (!session.user) throw new Error('Sign in before creating an account.');
        if (ownAccount !== null) throw new Error('This identity already has an account.');
        return client.procedures.createAccount({ args: buildCreateAccountInput({ name }) });
      }
      if (ownAccount === null) throw new Error('There is no account to name yet.');
      return client.procedures.updateAccountName({
        args: buildUpdateAccountNameInput({ accountId: ownAccount.id, name }),
      });
    },
    onSuccess: () => {
      // Refetches accounts AND the project count: a brand-new account arrives with a
      // server-provisioned default project, so the count is stale too.
      scope.refetch();
      void projectCountList.query.refetch();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const accountFieldErrors = accountAction.errorMessage
    ? classifyCreateAccountError(accountAction.errorMessage)
    : {};

  /**
   * `create`: always submittable — a blank name is legal and produces an unnamed account.
   * `rename`: blocked only when the normalised value already equals what the account is called,
   * because that write would change nothing.
   */
  const canSubmitAccountName =
    accountMode === 'create'
      ? createAccountEligible
      : normalizeAccountName(accountNameDraft) !== (ownAccount?.name ?? null);

  const openAccountNameDialog = () => {
    if (accountAction.errorMessage) accountAction.dismiss();
    setAccountNameDraft(ownAccount?.name ?? '');
    void setView({ accountNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
  };

  const accountSettings: AccountSettingsProps = {
    panel: {
      account: ownAccount === null ? null : { id: ownAccount.id, name: ownAccount.name ?? null },
      loading: scope.loading,
      error: scope.error ? 'Could not load your account.' : undefined,
      onRetry: () => scope.refetch(),
      onCreate: () => {
        if (!createAccountEligible) return;
        openAccountNameDialog();
      },
      createDisabled: !createAccountEligible,
      createReason: createAccountReason,
      onRename: openAccountNameDialog,
    },
    // `null` while loading or on a failed fetch as well as for "no account": the panel above has
    // already said which of the three it is, and a `status` row would claim a fourth.
    details:
      ownAccount === null || scope.loading || scope.error
        ? null
        : {
            id: ownAccount.id,
            status: ownAccount.status,
            defaultQuotaTier: ownAccount.defaultQuota ?? null,
          },
    onCopyId: (accountId: string) => {
      // Best-effort, same contract as the header's `AccountBadge`: `navigator.clipboard` is
      // undefined on insecure origins, and a failed copy leaves the id on screen to select by
      // hand, so there is nothing to recover.
      void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
    },
  };

  const accountNameDialog: AccountNameDialogProps = {
    open: view.accountNameOpen,
    mode: accountMode,
    subjectLabel: ownAccount?.id ?? session.user?.sub ?? '—',
    currentlyNamed: (ownAccount?.name ?? null) !== null,
    name: accountNameDraft,
    onNameChange: setAccountNameDraft,
    nameError: accountFieldErrors.nameError,
    submitting: accountAction.isPending,
    error: accountFieldErrors.error,
    canSubmit: canSubmitAccountName,
    onSubmit: () => {
      if (!canSubmitAccountName) return;
      accountAction.mutate({ mode: accountMode, name: accountNameDraft });
    },
    onCancel: () => {
      if (accountAction.errorMessage) accountAction.dismiss();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  };

  const activeAccount = scope.allAccounts.find(
    (account) => account.id === scope.value.accountId
  );

  return {
    scopeLabel: activeAccount ? accountScopeLabel(activeAccount) : undefined,
    accountSettings,
    accountNameDialog,
    projectCount: projectCountList.result.total ?? 0,
  };
}
