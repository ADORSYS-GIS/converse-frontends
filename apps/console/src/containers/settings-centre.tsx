'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { ProjectSettings } from '@lightbridge/ui-web/src/sections/project-settings';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

import { useSettingsScreen } from './use-settings-screen';

/**
 * `/settings` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * No right rail and no sheet triggers: nothing here retargets on a selection (console-ui skill —
 * "before adding a rail to a screen, ask whether its content retargets on selection; if it does
 * not, it is a toolbar"), and there is nothing to parameterise either. This screen has no filters
 * at all, which is precisely the point of separating it from Manage.
 *
 * Account first, projects second, because that is the dependency: with no account there are no
 * projects to configure, so the block that can create one comes first.
 */
export function SettingsCentre() {
  const screen = useSettingsScreen();

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeading
        title="Settings"
        subline="Account and project configuration. Filtering and browsing live on Manage."
      />

      <AccountSettings {...screen.accountSettings} />
      <ProjectSettings {...screen.projectSettings} />

      <AccountNameDialog {...screen.accountNameDialog} />
      <ProjectNameDialog {...screen.projectNameDialog} />
    </div>
  );
}
