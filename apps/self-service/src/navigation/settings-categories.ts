import type { IconName } from '@lightbridge/ui';

type FeatherIconName = IconName;

export type SettingsCategoryKey = 'account' | 'project';

export type SettingsCategory = {
  key: SettingsCategoryKey;
  titleKey: string;
  iconName: FeatherIconName;
  route: `/${string}`;
};

// The API-key category lands in a follow-up ticket (#55 is delivered as
// sequential PRs per its own risk note) — only list categories that actually
// have a working detail screen, rather than stubbing dead-end rows.
export const settingsCategories: SettingsCategory[] = [
  {
    key: 'account',
    titleKey: 'settings.categories.account',
    iconName: 'briefcase',
    route: '/settings-account',
  },
  {
    key: 'project',
    titleKey: 'settings.categories.project',
    iconName: 'folder',
    route: '/settings-project',
  },
];
