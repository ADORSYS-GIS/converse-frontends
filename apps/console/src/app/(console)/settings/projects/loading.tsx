'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectSettings } from '@lightbridge/ui-web/src/sections/project-settings';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { SettingsSubNav } from '../../../../containers/settings-sub-nav';

const noop = () => {};

/**
 * `/settings/projects` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why
 * this file exists at all. Mirrors `ProjectSettingsCentre`'s real geometry: `SettingsSubNav`
 * (no count — see `settings/account/loading.tsx`'s own note), then `ProjectSettings` inside a
 * `Card`, already carrying its own `loading` skeleton rendering.
 */
export default function SettingsProjectsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="loading projects…" />

      <SettingsSubNav />

      <Card>
        <ProjectSettings
          projects={[]}
          loading
          loadingRowCount={3}
          search=""
          onSearchChange={noop}
          onSelectRow={noop}
        />
      </Card>
    </div>
  );
}
