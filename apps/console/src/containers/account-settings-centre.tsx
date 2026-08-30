'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useOpenCreateAccountDialog } from './use-create-account-dialog';
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
 *
 * ADR-0026: `+ New account` is a `PageHeader` secondary action here — the shared create dialog
 * `app/(console)/layout.tsx` mounts once for the whole console, reached from
 * `useOpenCreateAccountDialog` (`use-create-account-dialog.ts`'s lightweight trigger half), the
 * SAME instance the workspace switcher's own `+ New account` row opens. This screen does not
 * render a second `AccountNameDialog` for `create`: only the panel's empty state and this button
 * ever trigger it, both through that one function. The `AccountNameDialog` still mounted directly
 * below is `screen.accountNameDialog` — `mode: 'rename'`, always, for whichever account is scoped.
 */
export function AccountSettingsCentre() {
  const screen = useAccountSettingsScreen();
  const openCreateAccount = useOpenCreateAccountDialog();

  const accountSettings: AccountSettingsProps = {
    ...screen.accountSettings,
    panel: { ...screen.accountSettings.panel, onCreate: openCreateAccount },
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle={screen.scopeLabel}
        action={
          <Button type="button" variant="secondary" onClick={openCreateAccount}>
            + New account
          </Button>
        }
      />

      <SettingsSubNav projectCount={screen.projectCount} />

      <AccountSettings {...accountSettings} />

      <AccountNameDialog {...screen.accountNameDialog} />
    </div>
  );
}
