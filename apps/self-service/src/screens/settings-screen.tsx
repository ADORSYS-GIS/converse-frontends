import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Stack } from '@lightbridge/ui';
import { usePermissions } from '@lightbridge/hooks';
import { SettingsCategoryListView } from '../views/settings/settings-category-list-view';
import { settingsCategories } from '../navigation/settings-categories';
import type { SettingsCategoryKey } from '../navigation/settings-categories';
import { useIsDesktop } from '../navigation/use-is-desktop';
import { AccountSettingsScreen } from './account-settings-screen';
import { ProjectSettingsScreen } from './project-settings-screen';
import { ApiKeySettingsScreen } from './api-key-settings-screen';
import { BudgetRefillScreen } from './budget-refill-screen';
import { BudgetReviewScreen } from './budget-review-screen';

const categoryScreens: Record<SettingsCategoryKey, React.ComponentType<{ embedded?: boolean }>> = {
  account: AccountSettingsScreen,
  project: ProjectSettingsScreen,
  apikey: ApiKeySettingsScreen,
  budget: BudgetRefillScreen,
  'budget-review': BudgetReviewScreen,
};

export function SettingsScreen() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { has } = usePermissions();
  const [activeKey, setActiveKey] = useState<SettingsCategoryKey>('account');

  // A category with `requiredPermission` (#148's budget rows) is hidden entirely for a caller
  // without the grant — same "the permission gate itself, not a feature flag, hides the entry
  // point" pattern the ticket calls for, mirroring `canManageMembers` in project-settings-view.
  const visibleCategories = useMemo(
    () => settingsCategories.filter((category) => !category.requiredPermission || has(category.requiredPermission)),
    [has]
  );

  if (isDesktop) {
    const activeCategoryVisible = visibleCategories.some((category) => category.key === activeKey);
    const resolvedKey = activeCategoryVisible ? activeKey : (visibleCategories[0]?.key ?? activeKey);
    const ActiveDetail = categoryScreens[resolvedKey];

    return (
      <Stack direction="row" style={{ flex: 1 }}>
        <SettingsCategoryListView
          categories={visibleCategories}
          activeKey={resolvedKey}
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
      categories={visibleCategories}
      onSelect={(category) => router.push(category.route)}
    />
  );
}
