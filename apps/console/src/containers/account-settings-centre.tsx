'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from './settings-sub-nav';
import { useAccountSettingsScreen } from './use-account-settings-screen';

/**
 * `/settings/account` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * No right rail and no sheet triggers: nothing here retargets on a selection (console-ui skill —
 * "before adding a rail to a screen, ask whether its content retargets on selection; if it does
 * not, it is a toolbar"). The subtitle is a scope line only — the old "Filtering and browsing
 * live on Manage" IA-explainer is dead; `/manage` was renamed `/projects` two phases ago, so the
 * sentence had already gone stale on its own terms even before this revamp.
 */
export function AccountSettingsCentre() {
  const screen = useAccountSettingsScreen();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle={screen.scopeLabel} />

      <SettingsSubNav projectCount={screen.projectCount} />

      <AccountSettings {...screen.accountSettings} />

      <AccountNameDialog {...screen.accountNameDialog} />
    </div>
  );
}
