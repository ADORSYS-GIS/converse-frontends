'use client';

import type { Account } from '@lightbridge/authz-rpc';
import type { AccountNameDialogProps } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useCreateAccountDialogParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { buildCreateAccountInput, normalizeAccountName } from './build-create-account-input';
import { classifyCreateAccountError } from './rpc-field-error';

/**
 * The create-account dialog + its `createAccount` mutation, lifted OUT of
 * `use-account-settings-screen.ts` (ADR-0026, lightbridge-authz#564): "+ New account" is now a
 * standing action reachable from two structurally separate places — the workspace switcher
 * (`console-chrome.tsx`, every route) and `/settings/account`'s own `PageHeader` — that must open
 * the SAME dialog instance. Mounted exactly once, in `app/(console)/layout.tsx` (console-ui skill
 * "Composition — chrome mounted once"), driven by `createAccountParsers.open` (`?new-account=`,
 * `url-state.ts`) so both trigger points read/write the identical URL flag rather than needing a
 * context or a prop threaded through the layout into routed content it does not otherwise touch.
 *
 * `mode` is always `'create'` — `AccountNameDialogMode` still carries `'rename'` for
 * `use-account-settings-screen.ts`'s own dialog, which renames whichever account is currently
 * SCOPED and is a structurally different write (existing account, `accountId` required).
 *
 * Two exports, for two different jobs:
 *
 *  - `useCreateAccountDialog()` — the FULL controller: dialog props AND the mutation that drives
 *    them. Call this exactly ONCE, in `app/(console)/layout.tsx`, which renders the one
 *    `AccountNameDialog` this flow ever mounts.
 *  - `useOpenCreateAccountDialog()` — just the trigger, for every OTHER call site (the workspace
 *    switcher's `+ New account` row, the settings `PageHeader` action, the account panel's empty
 *    state). It only flips the shared `?new-account=` flag; it does not instantiate a second
 *    mutation or a second local draft, because nothing outside the layout renders this dialog's
 *    UI. Calling `useCreateAccountDialog()` a second time anywhere else would work by accident
 *    (the URL flag and the `useSharedMutation` outcome are both genuinely shared) but would leave
 *    an orphaned, never-rendered `dialog` object and a redundant `useConsoleScope()`/`useList`
 *    subscription behind — this is the version those call sites should reach for instead.
 */
export interface CreateAccountDialogController {
  dialog: AccountNameDialogProps;
  /** The `+ New account` trigger every call site (switcher, `PageHeader`) wires its own button
   *  to — resets the draft and opens the shared dialog. */
  open: () => void;
}

const CREATE_ACCOUNT_MUTATION_KEY = ['settings', 'create-account'];

export function useCreateAccountDialog(): CreateAccountDialogController {
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const scope = useConsoleScope();
  const [params, setParams] = useCreateAccountDialogParams();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the dialog's typed-but-unsent name. `?new-account=true` — WHETHER
   * the dialog is open — is real view state and lives in the URL; this is its CONTENTS.
   */
  const [nameDraft, setNameDraft] = useState('');

  const action = useSharedMutation<{ name: string }, Account>({
    mutationKey: CREATE_ACCOUNT_MUTATION_KEY,
    mutationFn: async ({ name }) => {
      // A guard, not a UI branch — the dialog's own `canSubmit` already keeps its primary
      // disabled while signed out; this only fires against a caller bypassing the dialog.
      if (!session.user) throw new Error('Sign in before creating an account.');
      return client.procedures.createAccount({ args: buildCreateAccountInput({ name }) });
    },
    onSuccess: (account) => {
      // A brand-new account has to appear in the switcher/settings without a reload, and be the
      // one the caller lands on — the whole point of creating it.
      scope.refetch();
      scope.setValue({ accountId: account.id, projectId: null });
      setNameDraft('');
      void setParams({ open: false });
    },
  });

  const fieldErrors = action.errorMessage ? classifyCreateAccountError(action.errorMessage) : {};

  // Eligibility is just "signed in" — ADR-0026 removed the old "this identity already has an
  // account" `Conflict` contract entirely (a repeat call now creates an additional account), and
  // the backend's own `permAccountCreate` gate is enforced server-side; a refusal surfaces as
  // `fieldErrors.error` after a real submit, not as a pre-emptive client-side guess.
  const canSubmit = Boolean(session.user);

  return {
    open: () => {
      if (action.errorMessage) action.dismiss();
      setNameDraft('');
      void setParams({ open: true });
    },
    dialog: {
      open: params.open,
      mode: 'create',
      subjectLabel: session.user?.sub ?? '—',
      currentlyNamed: false,
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
        void setParams({ open: false });
      },
    },
  };
}

/**
 * The `+ New account` trigger, for every call site that is not `app/(console)/layout.tsx` itself
 * — see this module's own doc comment for why this is the lightweight half of the pair.
 */
export function useOpenCreateAccountDialog(): () => void {
  const [, setParams] = useCreateAccountDialogParams();
  return () => {
    void setParams({ open: true });
  };
}

export { normalizeAccountName };
