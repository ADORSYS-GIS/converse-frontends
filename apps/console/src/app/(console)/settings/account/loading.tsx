'use client';

import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from '../../../../containers/settings-sub-nav';

const noop = () => {};

/**
 * `/settings/account` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why
 * this file exists at all (every segment in this group is `force-dynamic`, so without a loading
 * boundary a navigation shows an empty floor until the payload lands).
 *
 * `SettingsSubNav` renders here too, without a count: it reads `usePathname()` (stable and known
 * before any data has loaded) rather than a fetched value, so mirroring it keeps this boundary's
 * geometry matching `AccountSettingsCentre`'s real layout instead of shifting once it resolves.
 * `AccountSettings` gets `details: null` rather than dashed-out rows: its own `loading` line is
 * the whole truth at this point, and a "Status —" row would claim a state nothing has fetched yet.
 */
export default function SettingsAccountLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="loading account…" />

      <SettingsSubNav />

      <AccountSettings
        panel={{ account: null, loading: true, onCreate: noop, onRename: noop }}
        details={null}
      />
    </div>
  );
}
