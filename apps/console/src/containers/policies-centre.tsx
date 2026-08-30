'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectPolicyControls } from '@lightbridge/ui-web/src/sections/project-policy-controls';
import {
  ProjectSettings,
  ProjectSettingsDetail,
} from '@lightbridge/ui-web/src/sections/project-settings';

import { useOpenCreateAccountDialog } from './use-create-account-dialog';
import { useOpenCreateProjectDialog } from './use-create-project-dialog';
import { usePoliciesScreen } from './use-policies-screen';

/**
 * `/settings/policies` — "Account / Project policies" (IA v3 phase 2). Composes THREE things in
 * one screen, in the order a visitor thinks about them:
 *
 *  1. `AccountSettings` — the RETAINED section from the deleted `/settings/account` route,
 *     unchanged: account identity (name/id/status/default quota tier).
 *  2. `ProjectSettings` — the RETAINED section from the deleted `/settings/projects` route,
 *     unchanged: the searchable project ledger, opening a row into a detail sheet.
 *  3. `ProjectPolicyControls` — NEW this phase, appended inside that SAME detail sheet, below
 *     `ProjectSettingsDetail`'s existing read-only field list: the `setProjectModelPolicy`/
 *     `setProjectAllowedModels` write controls for whichever project the sheet has open.
 *
 * Both `+ New account` and `+ New project` stay `PageHeader` actions — the same shared,
 * cross-route dialogs `/accounts/<id>/overview`, `/accounts/<id>/projects` and the inspector
 * rail's quick-settings all open (`use-create-account-dialog.ts`/`use-create-project-dialog.ts`,
 * mounted once in `app/(console)/layout.tsx`).
 *
 * No `SettingsSubNav` here — that horizontal Account/Projects tab row is gone along with the two
 * routes it switched between: the settings area's OWN left-rail nav (`settingsNavGroups`,
 * `client/console-chrome.tsx`) is what replaces it, one level up in the shell rather than a
 * second nav strip inside the centre column.
 */
export function PoliciesCentre() {
  const screen = usePoliciesScreen();
  const openCreateAccount = useOpenCreateAccountDialog();
  const createProject = useOpenCreateProjectDialog();
  const project = screen.projectDetail.project;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account / Project policies"
        subtitle={screen.scopeLabel}
        action={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={openCreateAccount}>
              + New account
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!createProject.eligible}
              title={createProject.reason}
              onClick={createProject.open}>
              + New project
            </Button>
          </div>
        }
      />

      {/* `panel.onCreate` overridden here, not inside `use-policies-screen.ts`: the empty-account
          state's own CTA opens the SAME shared, cross-route create dialog this header's own
          "+ New account" action does — the hook's own `onCreate` is a no-op placeholder, same
          contract the deleted `account-settings-centre.tsx` established. */}
      <AccountSettings
        {...screen.accountSettings}
        panel={{ ...screen.accountSettings.panel, onCreate: openCreateAccount }}
        onCopyId={screen.onCopyId}
      />

      <Card>
        <ProjectSettings {...screen.projectSettings} />
      </Card>

      <BottomSheet
        open={screen.projectDetail.open}
        onOpenChange={screen.projectDetail.onOpenChange}
        title={project?.name ?? ''}
        subtitle={project?.status}
        headerAction={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={screen.projectDetail.renameDisabled}
            title={screen.projectDetail.renameReason}
            onClick={screen.projectDetail.onRename}>
            Rename
          </Button>
        }>
        {project ? (
          <div className="flex flex-col gap-6">
            <ProjectSettingsDetail project={project} />
            {screen.policyControls ? <ProjectPolicyControls {...screen.policyControls} /> : null}
          </div>
        ) : null}
      </BottomSheet>

      <ProjectNameDialog {...screen.projectNameDialog} />
    </div>
  );
}
