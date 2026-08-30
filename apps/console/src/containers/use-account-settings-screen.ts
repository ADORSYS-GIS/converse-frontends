'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
// Subpath imports, not the package barrel — see `use-settings-screen.ts`'s own note (this file's
// predecessor) on why, still true: several `ui-web` agents work in parallel, and for TYPE-only
// imports the choice is free (they erase at compile time).
import type { AccountNameDialogProps } from '@lightbridge/ui-web/src/components/account-name-dialog';
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import { useList } from '@refinedev/core';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { SETTINGS_DIALOG_OPTIONS, useSettingsParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import { isAccountOwner } from './account-ownership';
import { buildUpdateAccountNameInput, normalizeAccountName } from './build-create-account-input';
import { classifyCreateAccountError } from './rpc-field-error';

/**
 * `/settings/account` — the account identity screen's data adapter, shared by its centre
 * (`account-settings-centre.tsx`) and the horizontal `SettingsSubNav` above it (for the
 * `Projects` tab's own trailing count).
 *
 * The split from the old, single `use-settings-screen.ts` (phase 6, admin/settings revamp — Attio
 * pattern, real routes) mirrors the route split: `/settings` redirects to `/settings/account`,
 * and `/settings/projects` is a genuinely separate route with its own data now, not a second
 * section stacked under the same header.
 *
 * ADR-0026 (lightbridge-authz#564, "one identity may own many accounts") reshaped what this hook
 * owns twice over:
 *
 *  - The screen shows the SCOPED account (`scope.value.accountId`), not "the signed-in
 *    principal's own account" — an identity can now own several, and the switcher is how you pick
 *    which one `/settings/account` is about, exactly like every other screen in this console.
 *  - `createAccount` moved out entirely, to `use-create-account-dialog.ts`: this hook's own
 *    `AccountNameDialog` now drives `updateAccountName` alone, renaming whichever account is
 *    scoped. "+ New account" — reachable from here too, via `PageHeader`'s secondary action — opens
 *    the SHARED create dialog (`app/(console)/layout.tsx`), not a local one, because the workspace
 *    switcher has to trigger the identical instance.
 *
 * `projectCount` is a lightweight `pageSize: 1` listing purely for the tab's own trailing count
 * (`use-projects-screen.ts`'s own `projects` query in `use-overview-screen.ts` uses the identical
 * pattern) — the full, paginated project list lives in `use-project-settings-screen.ts` instead.
 */

export interface AccountSettingsScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle`. */
  scopeLabel: string | undefined;
  accountSettings: AccountSettingsProps;
  /** Renames the SCOPED account. `mode` is always `'rename'` — see this module's own doc comment
   *  for where `'create'` now lives. */
  accountNameDialog: AccountNameDialogProps;
  /** The account's project count, for `SettingsSubNav`'s `Projects` tab. */
  projectCount: number;
}

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
   * The account this screen is about: whichever one the workspace switcher has scoped, not the
   * signed-in principal's home account. `scope.allAccounts` is already the backend's own answer
   * to "which accounts can this identity read" (`authz.cstack`'s owner-only `@@allow` on
   * `Account`), so a hit here already carries `isAccountOwner === true` — resolved explicitly all
   * the same, both for `AccountSettingsPanel.account` and to gate the rename control below.
   */
  const scopedAccount =
    scope.allAccounts.find((account) => account.id === scope.value.accountId) ?? null;
  const canRenameScopedAccount = isAccountOwner(scopedAccount, session);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the rename dialog's typed-but-unsent name. `?account-name=true`
   * — WHETHER the dialog is showing — is real view state and lives in the URL; this is its
   * CONTENTS.
   */
  const [accountNameDraft, setAccountNameDraft] = useState('');

  const renameAction = useSharedMutation<{ name: string }, Account>({
    mutationKey: ACCOUNT_NAME_MUTATION_KEY,
    mutationFn: async ({ name }) => {
      // A guard, not a UI branch — `canSubmitAccountName` already keeps the dialog's own primary
      // disabled in each of these cases; this only fires against a caller bypassing the dialog.
      if (scopedAccount === null) throw new Error('There is no account to name yet.');
      if (!canRenameScopedAccount) {
        throw new Error('Only the account owner can rename this account.');
      }
      return client.procedures.updateAccountName({
        args: buildUpdateAccountNameInput({ accountId: scopedAccount.id, name }),
      });
    },
    onSuccess: () => {
      scope.refetch();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const accountFieldErrors = renameAction.errorMessage
    ? classifyCreateAccountError(renameAction.errorMessage)
    : {};

  // Blocked only when the normalised value already equals what the account is called, because
  // that write would change nothing — same rule the rename half of this dialog has always used.
  const canSubmitAccountName =
    canRenameScopedAccount &&
    normalizeAccountName(accountNameDraft) !== (scopedAccount?.name ?? null);

  const openAccountNameDialog = () => {
    if (!canRenameScopedAccount) return;
    if (renameAction.errorMessage) renameAction.dismiss();
    setAccountNameDraft(scopedAccount?.name ?? '');
    void setView({ accountNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
  };

  const accountSettings: AccountSettingsProps = {
    panel: {
      account:
        scopedAccount === null ? null : { id: scopedAccount.id, name: scopedAccount.name ?? null },
      loading: scope.loading,
      error: scope.error ? 'Could not load your account.' : undefined,
      onRetry: () => scope.refetch(),
      // The empty state's own CTA — no scoped account at all yet (a brand-new identity with zero
      // accounts) — opens the SAME shared create dialog the `PageHeader` action and the workspace
      // switcher do; see `account-settings-centre.tsx` for the wiring.
      onCreate: () => undefined,
      onRename: openAccountNameDialog,
    },
    // `null` while loading or on a failed fetch as well as for "no account": the panel above has
    // already said which of the three it is, and a `status` row would claim a fourth.
    details:
      scopedAccount === null || scope.loading || scope.error
        ? null
        : {
            id: scopedAccount.id,
            status: scopedAccount.status,
            defaultQuotaTier: scopedAccount.defaultQuota ?? null,
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
    mode: 'rename',
    subjectLabel: scopedAccount?.id ?? session.user?.sub ?? '—',
    currentlyNamed: (scopedAccount?.name ?? null) !== null,
    name: accountNameDraft,
    onNameChange: setAccountNameDraft,
    nameError: accountFieldErrors.nameError,
    submitting: renameAction.isPending,
    error: accountFieldErrors.error,
    canSubmit: canSubmitAccountName,
    onSubmit: () => {
      if (!canSubmitAccountName) return;
      renameAction.mutate({ name: accountNameDraft });
    },
    onCancel: () => {
      if (renameAction.errorMessage) renameAction.dismiss();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  };

  return {
    scopeLabel: scopedAccount ? accountScopeLabel(scopedAccount) : undefined,
    accountSettings,
    accountNameDialog,
    projectCount: projectCountList.result.total ?? 0,
  };
}
