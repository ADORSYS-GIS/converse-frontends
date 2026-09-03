'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type { ProjectNameDialogProps } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { CONSOLE_DIALOGS, useUrlDialog } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { PROJECT_NAME_MUTATION_KEY } from './use-project-settings-screen';
import { classifyProjectNameError } from './rpc-field-error';

/**
 * `/settings/accounts/<id>/projects`' own `Rename` flow for the project its `BottomSheet` is
 * showing. A SEPARATE, lightweight instance of the same rename flow `/settings/policies` owns in
 * full (`use-project-settings-screen.ts`), not a shared cross-route controller: unlike account
 * rename or refill, there is no simultaneous-render risk to solve between routes here, because
 * the two routes never mount at once.
 *
 * IA v3 phase E ("the settings/accounts move"): this used to be a two-piece "full controller in
 * the inspector rail, lightweight trigger in the `BottomSheet`" split — the rail was the `lg`+
 * detail surface while the sheet covered everything below it, so BOTH were mounted at once (only
 * one CSS-hidden at a time) and needed to agree on one shared `?rename=true` flag without
 * double-mounting `ProjectNameDialog`. That rail case is gone: `/settings/accounts/<id>/projects`
 * lives in the settings area, which has no right rail at any tier (ADR 0013 D2), so the
 * `BottomSheet` is now this screen's ONLY detail surface, at every tier — one mount, one
 * controller, same as `/admin/refills-queue`'s own `ReviewDetailPanel`. `ProjectsCentre` calls
 * this directly and renders the one `ProjectNameDialog` it returns.
 *
 * Reusing `PROJECT_NAME_MUTATION_KEY` keeps this in step with `/settings/policies`' own instance
 * of this exact rename (`use-shared-mutation.ts`'s "two zones, one shared outcome" idiom) in the
 * one case that DOES matter: a pending/failed rename fired from one screen stays visible if a link
 * somehow lands on the other mid-flight.
 *
 * `?dialog=rename-project` (`CONSOLE_DIALOGS`, migrated 2026-09-03 from `?rename=true`) carries no
 * `dialog-id` and does not need one: the TARGET here is whichever project the ledger's own `?row=`
 * SELECTION already names (passed in as `project`), and a second, redundant id param could
 * contradict it. Selection and modal are separate facts, so they stay separate params.
 */
export interface ProjectRenameController {
  dialog: ProjectNameDialogProps;
  open: () => void;
}

export function useProjectRename(
  project: { id: string; name: string } | null
): ProjectRenameController {
  const client = useConsoleAuthzClient();
  const scope = useConsoleScope();
  const renameDialog = useUrlDialog(CONSOLE_DIALOGS.renameProject);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — same clause `use-project-settings-screen.ts`
   * documents for its own instance of this exact draft): the rename dialog's typed-but-unsent
   * name.
   */
  const [nameDraft, setNameDraft] = useState('');

  const action = useSharedMutation<{ id: string; name: string }, Project>({
    mutationKey: PROJECT_NAME_MUTATION_KEY,
    mutationFn: async ({ id, name }) => {
      if (!id) throw new Error('Choose a project before renaming it.');
      if (!name.trim()) throw new Error('Name the project before saving.');
      return client.projects.update(id, { name: name.trim() });
    },
    onSuccess: () => {
      scope.refetch();
      setNameDraft('');
      renameDialog.close();
    },
  });

  const fieldErrors = action.errorMessage ? classifyProjectNameError(action.errorMessage) : {};
  const open = renameDialog.open && project !== null;
  const canSubmit =
    project !== null && nameDraft.trim().length > 0 && nameDraft.trim() !== project.name;

  return {
    open: () => {
      if (project === null) return;
      if (action.errorMessage) action.dismiss();
      setNameDraft(project.name);
      renameDialog.openDialog();
    },
    dialog: {
      open,
      projectId: project?.id ?? '',
      currentName: project?.name ?? '',
      name: nameDraft,
      onNameChange: setNameDraft,
      nameError: fieldErrors.nameError,
      submitting: action.isPending,
      error: fieldErrors.error,
      canSubmit,
      onSubmit: () => {
        if (!canSubmit || project === null) return;
        action.mutate({ id: project.id, name: nameDraft });
      },
      onCancel: () => {
        if (action.errorMessage) action.dismiss();
        setNameDraft('');
        renameDialog.close();
      },
    },
  };
}
