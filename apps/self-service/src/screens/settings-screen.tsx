import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Stack } from '@lightbridge/ui';
import { SettingsCategoryListView } from '../views/settings/settings-category-list-view';
import { settingsCategories } from '../navigation/settings-categories';
import type { SettingsCategoryKey } from '../navigation/settings-categories';
import { useIsDesktop } from '../navigation/use-is-desktop';
import { AccountSettingsScreen } from './account-settings-screen';
import { ProjectSettingsScreen } from './project-settings-screen';

const categoryScreens: Record<SettingsCategoryKey, React.ComponentType<{ embedded?: boolean }>> = {
  account: AccountSettingsScreen,
  project: ProjectSettingsScreen,
};

export function SettingsScreen() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<SettingsCategoryKey>('account');

  if (isDesktop) {
    const ActiveDetail = categoryScreens[activeKey];

    return (
      <Stack direction="row" style={{ flex: 1 }}>
        <SettingsCategoryListView
          categories={settingsCategories}
          activeKey={activeKey}
          onSelect={(category) => setActiveKey(category.key)}
          variant="rail"
        />
        <Stack style={{ flex: 1 }}>
          <ActiveDetail embedded />
        </Stack>
      </Stack>
    );
  }

  return (
    <SettingsCategoryListView
      categories={settingsCategories}
      onSelect={(category) => router.push(category.route)}
    />
  );
}
