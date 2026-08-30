'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ProjectSettings, ProjectSettingsDetail } from '@lightbridge/ui-web/src/sections/project-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from './settings-sub-nav';
import { useOpenCreateProjectDialog } from './use-create-project-dialog';
import { useProjectSettingsScreen } from './use-project-settings-screen';

/**
 * `/settings/projects` — the centre column. The shell is mounted once, in
 * `app/(console)/layout.tsx`.
 *
 * `ProjectSettings` lives in a `Card` now — the same split `ProjectsLedger`/`projects-centre.tsx`
 * established (the section supplies the search box/rows/pager, this file supplies the card).
 *
 * No inspector-rail branch of its own: `containers/inspector-rail.tsx` only special-cases
 * `/projects` (row) and `/admin` (request) selections — a project picked here falls through to
 * the rail's scope quick-settings panel instead, same as every other route. The row detail always
 * opens as a `BottomSheet`, at every tier, the same "row opens a sheet" contract
 * `ProjectsLedger`/`ProjectDetail` use on `/projects`.
 *
 * Addition E (2026-08-30 owner round, screenshot: "a full-height void with 7 rows... a lone
 * Rename stranded at the bottom") — `Rename` moved off the sheet's `footer` and into its
 * `headerAction`, beside Close, targeting whichever project the sheet has open; the sheet's own
 * `subtitle` now states the project's status, so the title block reads "name / status" the way a
 * detail panel's header should, rather than making the reader open the field list to find it.
 *
 * Addition C.1/C.4 (2026-08-30, owner: "I create account in settings or in a raw dropdown, but
 * project only in projects? Not in settings?") — `+ New project` is a `PageHeader` secondary
 * action here too now, opening the SAME shared, cross-route dialog `/projects`' own action and
 * the inspector rail's quick-settings row open (`use-create-project-dialog.ts`, mounted once in
 * `app/(console)/layout.tsx`).
 */
export function ProjectSettingsCentre() {
  const screen = useProjectSettingsScreen();
  const project = screen.projectDetail.project;
  const createProject = useOpenCreateProjectDialog();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle={screen.scopeLabel}
        action={
          <Button
            type="button"
            variant="secondary"
            disabled={!createProject.eligible}
            title={createProject.reason}
            onClick={createProject.open}>
            + New project
          </Button>
        }
      />

      <SettingsSubNav projectCount={screen.projectCount} />

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
        {project ? <ProjectSettingsDetail project={project} /> : null}
      </BottomSheet>

      <ProjectNameDialog {...screen.projectNameDialog} />
    </div>
  );
}
