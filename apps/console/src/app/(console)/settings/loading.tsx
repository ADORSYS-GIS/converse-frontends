'use client';

import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { ProjectSettings } from '@lightbridge/ui-web/src/sections/project-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

const noop = () => {};

/**
 * `/settings` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all (every segment in this group is `force-dynamic`, so without a loading boundary a
 * navigation shows an empty floor until the payload lands).
 *
 * Both sections already carry their own loading rendering, so this file only drives those flags
 * with empty data — the same contract `SettingsCentre` uses while `useSettingsScreen()`'s own
 * queries are in flight. `AccountSettings` gets `details: null` rather than dashed-out rows: the
 * panel's own `loading` line is the whole truth at this point, and a "Status —" row would claim a
 * state nothing has fetched yet.
 */
export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="loading account…" />

      <AccountSettings
        panel={{ account: null, loading: true, onCreate: noop, onRename: noop }}
        details={null}
      />

      <ProjectSettings projects={[]} loading loadingRowCount={3} onRename={noop} />
    </div>
  );
}
