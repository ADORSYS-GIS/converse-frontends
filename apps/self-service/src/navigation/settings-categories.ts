import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type SettingsCategoryKey = 'account' | 'project';

export type SettingsCategory = {
  key: SettingsCategoryKey;
  titleKey: string;
  iconName: IoniconName;
  route: `/${string}`;
};

// The API-key category lands in a follow-up ticket (#55 is delivered as
// sequential PRs per its own risk note) — only list categories that actually
// have a working detail screen, rather than stubbing dead-end rows.
export const settingsCategories: SettingsCategory[] = [
  {
    key: 'account',
    titleKey: 'settings.categories.account',
    iconName: 'business-outline',
    route: '/settings-account',
  },
  {
    key: 'project',
    titleKey: 'settings.categories.project',
    iconName: 'folder-outline',
    route: '/settings-project',
  },
];
