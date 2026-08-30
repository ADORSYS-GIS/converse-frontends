'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { DetailSheet } from '@lightbridge/ui-web/src/components/detail-sheet';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ProjectSettings, ProjectSettingsDetail } from '@lightbridge/ui-web/src/sections/project-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from './settings-sub-nav';
import { useProjectSettingsScreen } from './use-project-settings-screen';

/**
 * `/settings/projects` — the centre column. The shell is mounted once, in
 * `app/(console)/layout.tsx`.
 *
 * `ProjectSettings` lives in a `Card` now — the same split `ProjectsLedger`/`projects-centre.tsx`
 * established (the section supplies the search box/rows/pager, this file supplies the card). No
 * right rail: nothing here retargets on a selection outside the sheet, same reasoning as
 * `/settings/account`.
 *
 * Phase 9 (Addition C) — a project row's click opens `DetailSheet` with the project's full field
 * list (`ProjectSettingsDetail`), and `Rename` moved off the row into the sheet's own footer,
 * targeting whichever project is open. This is the same "row opens a sheet, the sheet's footer
 * carries the write" shape `ProjectsLedger`/`ProjectDetail` already use on `/projects` — settings
 * identity gets its own screen (owner, 2026-08-29: "We cannot modify account core information on
 * the same page we're filtering"), but the interaction pattern for reaching a single project's
 * detail is the one the console already has, not a new one.
 */
export function ProjectSettingsCentre() {
  const screen = useProjectSettingsScreen();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle={screen.scopeLabel} />

      <SettingsSubNav projectCount={screen.projectCount} />

      <Card>
        <ProjectSettings {...screen.projectSettings} />
      </Card>

      <DetailSheet
        open={screen.projectDetail.open}
        onOpenChange={screen.projectDetail.onOpenChange}
        title={screen.projectDetail.project?.name ?? ''}
        footer={
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
        {screen.projectDetail.project ? (
          <ProjectSettingsDetail project={screen.projectDetail.project} />
        ) : null}
      </DetailSheet>

      <ProjectNameDialog {...screen.projectNameDialog} />
    </div>
  );
}
