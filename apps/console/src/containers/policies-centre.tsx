'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectPolicyControls } from '@lightbridge/ui-web/src/sections/project-policy-controls';
import {
  ProjectSettings,
  ProjectSettingsDetail,
} from '@lightbridge/ui-web/src/sections/project-settings';

import { usePoliciesScreen } from './use-policies-screen';

/**
 * `/settings/policies` — "Project policies" (IA v3 phase 2, narrowed by IA v3 phase E). Owner
 * directive: "On the page /settings/policies, there's no sense in having account or project
 * creation... Instead remove that." Two things stay, both genuinely "policy editing":
 *
 *  1. `ProjectSettings` — the retained searchable project ledger, still needed as the PICKER this
 *     screen's own governance controls act on (browsing projects is not creation).
 *  2. `ProjectPolicyControls` — appended inside the SAME detail sheet, below
 *     `ProjectSettingsDetail`'s existing read-only field list: the `setProjectModelPolicy`/
 *     `setProjectAllowedModels` write controls for whichever project the sheet has open.
 *
 * Everything else this page used to carry moved out this phase: `AccountSettings` (rename +
 * id/status/tier facts) to `/settings/accounts/<id>`, `+ New account` to `/settings/accounts`'s
 * own `PageHeader`, `+ New project` to `/settings/accounts/<id>/projects`'s own `PageHeader` (and
 * its `?create=true` landing flag). No `SettingsSubNav` here either — that horizontal Account/
 * Projects tab row is gone along with the two routes it switched between: the settings area's OWN
 * left-rail nav (`settingsNavGroups`, `client/console-chrome.tsx`) is what replaces it, one level
 * up in the shell rather than a second nav strip inside the centre column.
 */
export function PoliciesCentre() {
  const screen = usePoliciesScreen();
  const project = screen.projectDetail.project;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Project policies" subtitle={screen.scopeLabel} />

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
