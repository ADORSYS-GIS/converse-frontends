import React from 'react';
import { useRouter } from 'expo-router';
import { Stack } from '@lightbridge/ui';
import { SettingsCategoryListView } from '../views/settings/settings-category-list-view';
import { settingsCategories } from '../navigation/settings-categories';
import { useIsDesktop } from '../navigation/use-is-desktop';
import { AccountSettingsScreen } from './account-settings-screen';

export function SettingsScreen() {
  const isDesktop = useIsDesktop();
  const router = useRouter();

  if (isDesktop) {
    return (
      <Stack direction="row" style={{ flex: 1 }}>
        <SettingsCategoryListView
          categories={settingsCategories}
          activeKey="account"
          onSelect={() => undefined}
          variant="rail"
        />
        <Stack style={{ flex: 1 }}>
          <AccountSettingsScreen embedded />
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
