'use client';

import type { Project } from '@lightbridge/authz-rpc';
import type { ProjectNameDialogProps } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { SETTINGS_DIALOG_OPTIONS, useSettingsParams } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { PROJECT_NAME_MUTATION_KEY } from './use-project-settings-screen';
import { classifyProjectNameError } from './rpc-field-error';

/**
 * The inspector rail's own `Rename` flow for the project it is showing (`/projects` with a row
 * selected — see `containers/inspector-rail.tsx`). A SEPARATE, lightweight instance of the same
 * rename flow `/settings/projects` owns in full (`use-project-settings-screen.ts`), not a shared
 * cross-route controller: unlike account rename or refill, there is no simultaneous-render risk to
 * solve BETWEEN routes here, because the two routes never mount at once. There IS one WITHIN
 * `/projects` itself, though: `projects-centre.tsx`'s own `BottomSheet` (below `lg`) and
 * `containers/inspector-rail.tsx` (at `lg`+) are both always mounted at once (only one is visually
 * hidden by CSS at a time), and both show a `Rename` trigger for the same selected project — so
 * this follows the exact "one full controller, one lightweight trigger" split
 * `use-create-account-dialog.ts` established:
 *
 *  - `useProjectRename(project)` — the FULL controller: dialog props AND the mutation. Call this
 *    exactly ONCE, from `containers/inspector-rail.tsx`, which renders the one `ProjectNameDialog`
 *    this flow ever mounts. `ProjectNameDialog` is a centred MODAL (Base UI `Dialog`, portalled to
 *    `document.body`), not part of the rail's own visual real estate — an ancestor `hidden` class
 *    on the rail's ~280px column does not hide a portalled descendant, so this keeps working
 *    correctly even while the rail itself is CSS-hidden below `lg`.
 *  - `useOpenProjectRename()` — just the trigger, for `projects-centre.tsx`'s `BottomSheet`
 *    `headerAction`. It only flips the shared `?rename=true` flag; the rail's own controller reacts
 *    to it regardless of which viewport tier is currently showing which surface.
 *
 * Reusing `PROJECT_NAME_MUTATION_KEY` keeps this in step with `/settings/projects`' own instance
 * of this exact rename (`use-shared-mutation.ts`'s "two zones, one shared outcome" idiom) in the
 * one case that DOES matter: a pending/failed rename fired from one screen stays visible if a link
 * somehow lands on the other mid-flight.
 *
 * `?rename=true` (`settingsParsers.projectNameOpen`) is reused verbatim rather than a new param:
 * it is already exactly "is the project-rename dialog open", and this hook never touches
 * `renameProjectId` (`?row=`) at all — the TARGET here is whichever project `/projects`' own
 * `?row=` selection already names (`manageParsers.selectedProjectId`, passed in as `project`), not
 * a second, redundant id param.
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
  const [view, setView] = useSettingsParams();

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
      void setView({ projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
    },
  });

  const fieldErrors = action.errorMessage ? classifyProjectNameError(action.errorMessage) : {};
  const open = view.projectNameOpen && project !== null;
  const canSubmit =
    project !== null && nameDraft.trim().length > 0 && nameDraft.trim() !== project.name;

  return {
    open: () => {
      if (project === null) return;
      if (action.errorMessage) action.dismiss();
      setNameDraft(project.name);
      void setView({ projectNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
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
        void setView({ projectNameOpen: false }, SETTINGS_DIALOG_OPTIONS);
      },
    },
  };
}

/** The `Rename` trigger for `projects-centre.tsx`'s `BottomSheet` — see this module's own doc
 *  comment for why the actual dialog lives in `containers/inspector-rail.tsx` instead. */
export function useOpenProjectRename(): () => void {
  const [, setView] = useSettingsParams();
  return () => {
    void setView({ projectNameOpen: true }, SETTINGS_DIALOG_OPTIONS);
  };
}
