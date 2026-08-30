'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ProjectSettings } from '@lightbridge/ui-web/src/sections/project-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from './settings-sub-nav';
import { useProjectSettingsScreen } from './use-project-settings-screen';

/**
 * `/settings/projects` — the centre column. The shell is mounted once, in
 * `app/(console)/layout.tsx`.
 *
 * `ProjectSettings` lives in a `Card` now — the same split `ProjectsLedger`/`projects-centre.tsx`
 * established (the section supplies the search box/blocks/pager, this file supplies the card).
 * No right rail: nothing here retargets on a selection, same reasoning as `/settings/account`.
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

      <ProjectNameDialog {...screen.projectNameDialog} />
    </div>
  );
}
