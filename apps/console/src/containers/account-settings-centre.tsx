'use client';

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
 * No sheet triggers of its own: nothing HERE retargets on a selection. The subtitle is a scope
 * line only — the old "Filtering and browsing live on Manage" IA-explainer is dead; `/manage` was
 * renamed `/projects` two phases ago, so the sentence had already gone stale on its own terms even
 * before this revamp.
 *
 * ADR-0026: `+ New account` is a `PageHeader` secondary action here — the shared create dialog
 * `app/(console)/layout.tsx` mounts once for the whole console, reached from
 * `useOpenCreateAccountDialog` (`use-create-account-dialog.ts`'s lightweight trigger half), the
 * SAME instance the workspace switcher's own `+ New account` row opens.
 *
 * Addition C (rail-return round, 2026-08-30): the RENAME dialog moved out the same way — this
 * screen mounts neither `AccountNameDialog` any more. `screen.accountSettings.panel.onRename` is
 * now `useOpenRenameAccountDialog()`'s trigger (wired inside `use-account-settings-screen.ts`),
 * and the one `AccountNameDialog` (`mode: 'rename'`) instance it opens lives in
 * `app/(console)/layout.tsx`, alongside the `create` one — the inspector rail's quick-settings
 * panel needs to trigger the identical write from every other route, which a screen-local dialog
 * could never do.
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
    </div>
  );
}
