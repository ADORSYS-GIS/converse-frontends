'use client';

import type { Account } from '@lightbridge/authz-rpc';
import type { AccountNameDialogProps } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { CONSOLE_DIALOGS, useUrlDialog } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { accountScopeLabel } from './account-label';
import { isAccountOwner } from './account-ownership';
import { buildUpdateAccountNameInput, normalizeAccountName } from './build-create-account-input';
import { classifyCreateAccountError } from './rpc-field-error';

/**
 * The RENAME half of `AccountNameDialog`, lifted OUT of `use-account-settings-screen.ts`
 * (Addition C, owner round 2: the inspector rail's quick-settings panel needs to trigger the exact
 * same "rename the SCOPED account" write from ANY route, not only `/settings/account` — the same
 * "two structurally separate triggers, one dialog instance" shape `use-create-account-dialog.ts`
 * already solves for CREATE, applied to its sibling verb). Mounted exactly once, in
 * `app/(console)/layout.tsx`, so it renders regardless of which route triggered it.
 *
 * The wire flag is `?dialog=account-name` (`CONSOLE_DIALOGS`, migrated 2026-09-03) — no new
 * param — only WHO renders the dialog and WHO owns the mutation moved. `/settings/account`
 * (`account-settings-centre.tsx`) no longer mounts `AccountNameDialog` itself; it only calls
 * `useOpenRenameAccountDialog()`, the lightweight trigger half below.
 */
export interface RenameAccountDialogController {
  dialog: AccountNameDialogProps;
  open: () => void;
}

const ACCOUNT_NAME_MUTATION_KEY = ['settings', 'account-name'];

export function useRenameAccountDialog(): RenameAccountDialogController {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const dialog = useUrlDialog(CONSOLE_DIALOGS.accountName);

  const scopedAccount =
    scope.allAccounts.find((account) => account.id === scope.value.accountId) ?? null;
  const canRename = isAccountOwner(scopedAccount, session);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause `use-account-settings-screen.ts`
   * documented before this moved): the rename dialog's typed-but-unsent name.
   *
   * Carried WITH the account id it was typed against (`seededFor`) rather than seeded by a
   * `setState` inside an effect — the same shape `use-budget-schedule-form-screen.ts` already uses
   * for its prefilled edit form, and for the same two reasons. It keeps the prefill a pure
   * derivation (an effect that sets state on open is a cascading render, and React's own lint says
   * so), and it states the invalidation rule in the data instead of in a dependency array: a draft
   * belongs to ONE open dialog on ONE account, so a mid-edit refetch of the account list cannot
   * clobber it, and reopening on a different account cannot inherit it.
   */
  const [draft, setDraft] = useState<{ seededFor: string | null; name: string }>({
    seededFor: null,
    name: '',
  });

  // Whichever of the two triggers (this screen's own PageHeader/row action, or the rail's) opened
  // the dialog, this instance is the only one that renders it — so the draft seeds itself from the
  // scoped account's current name rather than relying on the trigger, which cannot reach this
  // state, to have done it.
  const draftKey = dialog.open ? (scopedAccount?.id ?? 'none') : null;
  const nameDraft = draft.seededFor === draftKey ? draft.name : (scopedAccount?.name ?? '');
  const setNameDraft = (name: string) => setDraft({ seededFor: draftKey, name });

  const action = useSharedMutation<{ name: string }, Account>({
    mutationKey: ACCOUNT_NAME_MUTATION_KEY,
    mutationFn: async ({ name }) => {
      if (scopedAccount === null) throw new Error('There is no account to name yet.');
      if (!canRename) throw new Error('Only the account owner can rename this account.');
      return client.procedures.updateAccountName({
        args: buildUpdateAccountNameInput({ accountId: scopedAccount.id, name }),
      });
    },
    onSuccess: () => {
      scope.refetch();
      setNameDraft('');
      dialog.close();
    },
  });

  const fieldErrors = action.errorMessage ? classifyCreateAccountError(action.errorMessage) : {};

  const canSubmit = canRename && normalizeAccountName(nameDraft) !== (scopedAccount?.name ?? null);

  return {
    open: () => {
      if (!canRename) return;
      if (action.errorMessage) action.dismiss();
      // No seeding here: the draft derives itself from `draftKey` the moment the dialog opens.
      dialog.openDialog();
    },
    dialog: {
      open: dialog.open,
      mode: 'rename',
      subjectLabel: scopedAccount ? accountScopeLabel(scopedAccount) : '—',
      currentlyNamed: scopedAccount?.name != null,
      name: nameDraft,
      onNameChange: setNameDraft,
      nameError: fieldErrors.nameError,
      submitting: action.isPending,
      error: fieldErrors.error,
      canSubmit,
      onSubmit: () => {
        if (!canSubmit) return;
        action.mutate({ name: nameDraft });
      },
      onCancel: () => {
        if (action.errorMessage) action.dismiss();
        setNameDraft('');
        dialog.close();
      },
    },
  };
}

/**
 * The `Rename`/`Name this account` trigger, for every call site that is not
 * `app/(console)/layout.tsx` itself — `/settings/account`'s own row action, and the inspector
 * rail's quick-settings panel.
 */
export function useOpenRenameAccountDialog(): () => void {
  return useUrlDialog(CONSOLE_DIALOGS.accountName).openDialog;
}
