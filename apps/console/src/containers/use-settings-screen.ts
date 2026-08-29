'use client';

import type { Account, Project } from '@lightbridge/authz-rpc';
// The two new section/component families are imported from their own subpaths rather than the
// package barrel because the barrel entries for them are still landing (three agents are working
// in `packages/ui-web` at once). Subpath imports are the published contract either way
// (`"./src/*"` in the package's `exports`), and for TYPE-only imports the choice is free — they
// erase at compile time, so which module re-exports them costs nothing.
import type {
  AccountNameDialogMode,
  AccountNameDialogProps,
} from '@lightbridge/ui-web/src/components/account-name-dialog';
import type { ProjectNameDialogProps } from '@lightbridge/ui-web/src/components/project-name-dialog';
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import type {
  ProjectSettingsProps,
  ProjectSettingsRow,
} from '@lightbridge/ui-web/src/sections/project-settings';
import { useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { SETTINGS_DIALOG_OPTIONS, useSettingsParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import {
  buildCreateAccountInput,
  buildUpdateAccountNameInput,
  normalizeAccountName,
} from './build-create-account-input';
import { toProjectSettingsRows } from './project-settings-rows';
import { classifyCreateAccountError, classifyProjectNameError } from './rpc-field-error';

/**
 * `/settings` — the screen's data adapter, shared by its centre (`page.tsx`) and its left-rail
 * sub-nav (`@scope/settings/page.tsx`). There is no `@rail` slot: nothing on this screen retargets
 * on a selection, which is the console-ui skill's test for whether a screen earns a right rail.
 *
 * **Why this screen exists** (owner, 2026-08-29): "We need a settings page, with account x project
 * settings and stuffs. We cannot modify account core information on the same page we're
 * filtering." `AccountPanel` — and with it "Name this account", a core account mutation — used to
 * be mounted in `manage-centre.tsx`, directly above the Manage ledger's own filters. Manage is for
 * finding and filtering projects; this screen is for changing what things *are*. The panel, its
 * dialog, its `?account-name=` param and its two procedures all moved here together, unchanged in
 * behaviour.
 */

const PAGE_SIZE = 100;

/**
 * Module-level so both zones agree on the identity, exactly as `use-manage-screen.ts` documents.
 *
 * One key for both account writes: `createAccount` and `updateAccountName` are never available at
 * once — the signed-in subject either holds an account or does not — so they cannot be in flight
 * simultaneously, and sharing the key means the one `AccountNameDialog` reads one
 * `submitting`/`errorMessage` pair regardless of which procedure it is driving.
 */
const ACCOUNT_NAME_MUTATION_KEY = ['settings', 'account-name'];
/** One key for every project rename: only one rename dialog can be open at a time (`?rename=` is
 *  a single id), so a second rename cannot overlap the first. */
const PROJECT_NAME_MUTATION_KEY = ['settings', 'project-name'];

export interface SettingsScreen {
  /** `AccountSettings`' props — `AccountPanel`'s three states plus the read-only fact rows. */
  accountSettings: AccountSettingsProps;
  /** `AccountNameDialog`'s props — the same dialog for both account writes; `mode` is derived
   *  from whether an account exists, never chosen by the user. */
  accountNameDialog: AccountNameDialogProps;
  projectSettings: ProjectSettingsProps;
  projectNameDialog: ProjectNameDialogProps;
  /** The account's project count, for the left rail's sub-nav. */
  projectCount: number;
}

export function useSettingsScreen(): SettingsScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const [view, setView] = useSettingsParams();

  const list = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: PAGE_SIZE },
    filters: scope.value.accountId
      ? [{ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId }]
      : [],
    sorters: [{ field: 'name', order: 'asc' }],
  });

  const projects = list.result.data;
  const rows = useMemo(() => toProjectSettingsRows(projects), [projects]);

  // Retries the genuine failed fetch AND refreshes the list after a real write.
  const refresh = () => {
    void list.query.refetch();
  };

  /**
   * The signed-in principal's OWN account, matched on `sub` rather than on the scoped `?account=`
   * id.
   *
   * `accounts.id` IS the JWT subject (ADR-0006) and one subject holds at most one account, so this
   * is the only account `createAccount`/`updateAccountName` could ever target — matching the scoped
   * id instead would make the panel silently retarget when a link carries someone else's account.
   * `null` here means "signed in, no account", which is what the panel offers a way out of; it is
   * distinguished from "we do not know yet" by `scope.loading`/`scope.error`, which the panel
   * renders separately. Carried over verbatim from `use-manage-screen.ts`.
   */
  const ownAccount: Account | null =
    scope.allAccounts.find((account) => account.id === session.user?.sub) ?? null;
  const accountMode: AccountNameDialogMode = ownAccount === null ? 'create' : 'rename';

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the account dialog's typed-but-unsent name. `?account-name=true`
   * — WHETHER the dialog is showing — is real view state and lives in the URL; this is its
   * CONTENTS, which are typed prose ahead of a submit and would otherwise be written into browser
   * history and into any link copied from the address bar. Seeded from the current name when the
   * dialog opens, so a rename starts from what the account is actually called rather than blank.
   */
  const [accountNameDraft, setAccountNameDraft] = useState('');

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause, same argument): the project rename
   * dialog's typed-but-unsent name. `?rename=<project id>` — WHICH project's dialog is open — is
   * real view state and lives in the URL; the half-typed replacement name is not.
   */
  const [projectNameDraft, setProjectNameDraft] = useState('');

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
      // Refetches accounts AND projects: a brand-new account arrives with a server-provisioned
      // default project, so the list below is stale too.
      scope.refetch();
      refresh();
      setAccountNameDraft('');
      void setView({ accountNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const accountFieldErrors = accountAction.errorMessage
    ? classifyCreateAccountError(accountAction.errorMessage)
    : {};

  /**
   * `create`: always submittable — a blank name is legal and produces an unnamed account, so a
   * "fill this in" gate here would be stricter than the server's own (which normalises blank to
   * `NULL`).
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

  /**
   * Presentation-only mirror of `model.Project.update`'s `@@allow` gate (`authz.cstack` —
   * `account.id == auth().id || members.some.accountId == auth().id`). The console models one
   * account per signed-in principal (ADR-0006), so the owner half is "the scoped account IS the
   * signed-in subject"; the membership half is not checkable from here, because the projects list
   * endpoint does not return the roster. `false` whenever ownership cannot be confirmed, never
   * defaulted to `true` — same disclaimer as `use-manage-screen.ts`'s `createProjectEligible`:
   * `lightbridge-authz`'s own RBAC check is the enforcement, this only avoids offering a control
   * that would fail.
   */
  let renameEligible: boolean;
  let renameReason: string | undefined;
  if (!scope.value.accountId) {
    renameEligible = false;
    renameReason = 'Select an account to change its project settings.';
  } else if (!session.user) {
    renameEligible = false;
    renameReason = 'Sign in to change project settings.';
  } else if (session.user.sub !== scope.value.accountId) {
    renameEligible = false;
    renameReason = 'Only the account owner or a project member can rename a project.';
  } else {
    renameEligible = true;
    renameReason = undefined;
  }

  // The dialog's subject is `?rename=<id>`, looked up in the loaded list — so a link to an open
  // rename reopens on that project, and Back closes it instead of leaving `/settings`.
  const renameTarget = rows.find((row) => row.id === view.renameProjectId) ?? null;

  const projectAction = useSharedMutation<{ id: string; name: string }, Project>({
    mutationKey: PROJECT_NAME_MUTATION_KEY,
    mutationFn: async ({ id, name }) => {
      // Guards, not UI branches: `canSubmitProjectName` already keeps the dialog's own primary
      // disabled in both cases — this only fires against a caller bypassing the dialog.
      if (!id) throw new Error('Choose a project before renaming it.');
      if (!name.trim()) throw new Error('Name the project before saving.');
      // `model.Project.update` is the generic verb, and `name` is the ONE field on `Project` it
      // can actually affect: every other column is `@readonly` with its own procedure. The patch
      // carries exactly that field for the same reason.
      return client.projects.update(id, { name: name.trim() });
    },
    onSuccess: () => {
      refresh();
      // The scope hook's own project list feeds the header/scope selector, so it is stale too.
      scope.refetch();
      setProjectNameDraft('');
      void setView({ renameProjectId: '' }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const projectFieldErrors = projectAction.errorMessage
    ? classifyProjectNameError(projectAction.errorMessage)
    : {};

  const canSubmitProjectName =
    renameTarget !== null &&
    projectNameDraft.trim().length > 0 &&
    projectNameDraft.trim() !== renameTarget.name;

  const projectSettings: ProjectSettingsProps = {
    projects: rows,
    loading: list.query.isLoading,
    loadingRowCount: 3,
    error: list.query.isError ? 'Could not load projects.' : undefined,
    onRetry: refresh,
    onRename: (project: ProjectSettingsRow) => {
      if (!renameEligible) return;
      if (projectAction.errorMessage) projectAction.dismiss();
      setProjectNameDraft(project.name);
      void setView({ renameProjectId: project.id }, SETTINGS_DIALOG_OPTIONS);
    },
    renameDisabled: !renameEligible,
    renameReason,
  };

  const projectNameDialog: ProjectNameDialogProps = {
    open: renameTarget !== null,
    projectId: renameTarget?.id ?? '',
    currentName: renameTarget?.name ?? '',
    name: projectNameDraft,
    onNameChange: setProjectNameDraft,
    nameError: projectFieldErrors.nameError,
    submitting: projectAction.isPending,
    error: projectFieldErrors.error,
    canSubmit: canSubmitProjectName,
    onSubmit: () => {
      if (!canSubmitProjectName || renameTarget === null) return;
      projectAction.mutate({ id: renameTarget.id, name: projectNameDraft });
    },
    onCancel: () => {
      if (projectAction.errorMessage) projectAction.dismiss();
      setProjectNameDraft('');
      void setView({ renameProjectId: '' }, SETTINGS_DIALOG_OPTIONS);
    },
  };

  return {
    accountSettings,
    accountNameDialog,
    projectSettings,
    projectNameDialog,
    projectCount: list.result.total ?? rows.length,
  };
}
