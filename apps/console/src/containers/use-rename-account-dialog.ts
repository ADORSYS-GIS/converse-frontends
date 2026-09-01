'use client';

import type { Account } from '@lightbridge/authz-rpc';
import type { AccountNameDialogProps } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { useEffect, useState } from 'react';

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
 * The RENAME half of `AccountNameDialog`, lifted OUT of `use-account-settings-screen.ts`
 * (Addition C, owner round 2: the inspector rail's quick-settings panel needs to trigger the exact
 * same "rename the SCOPED account" write from ANY route, not only `/settings/account` — the same
 * "two structurally separate triggers, one dialog instance" shape `use-create-account-dialog.ts`
 * already solves for CREATE, applied to its sibling verb). Mounted exactly once, in
 * `app/(console)/layout.tsx`, so it renders regardless of which route triggered it.
 *
 * The wire flag stays `?account-name=true` (`settingsParsers.accountNameOpen`) — no rename, no new
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
  const [view, setView] = useSettingsParams();

  const scopedAccount =
    scope.allAccounts.find((account) => account.id === scope.value.accountId) ?? null;
  const canRename = isAccountOwner(scopedAccount, session);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause `use-account-settings-screen.ts`
   * documented before this moved): the rename dialog's typed-but-unsent name.
   */
  const [nameDraft, setNameDraft] = useState('');

  // Whichever of the two triggers (this screen's own PageHeader/row action, or the rail's) opened
  // the dialog, this instance is the only one that renders it — so it has to seed its OWN draft
  // from the scoped account's current name the moment `?account-name=` flips true, rather than
  // relying on the trigger (which has no access to this state) to have done it.
  useEffect(() => {
    if (view.accountNameOpen) setNameDraft(scopedAccount?.name ?? '');
    // Deliberately keyed on the open transition alone — re-seeding on every `scopedAccount`
    // change would clobber an in-progress edit if the account list happens to refetch while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.accountNameOpen]);

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
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const fieldErrors = action.errorMessage ? classifyCreateAccountError(action.errorMessage) : {};

  const canSubmit =
    canRename && normalizeAccountName(nameDraft) !== (scopedAccount?.name ?? null);

  return {
    open: () => {
      if (!canRename) return;
      if (action.errorMessage) action.dismiss();
      setNameDraft(scopedAccount?.name ?? '');
      void setView({ accountNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
    },
    dialog: {
      open: view.accountNameOpen,
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
        void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
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
  const [, setView] = useSettingsParams();
  return () => {
    void setView({ accountNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
  };
}
