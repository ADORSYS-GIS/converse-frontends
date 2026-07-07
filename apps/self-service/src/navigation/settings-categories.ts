import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type SettingsCategoryKey = 'account';

export type SettingsCategory = {
  key: SettingsCategoryKey;
  titleKey: string;
  iconName: IoniconName;
  route: `/${string}`;
};

// Project and API-key categories land in follow-up tickets (#55 is delivered as
// sequential PRs per its own risk note) — only list categories that actually
// have a working detail screen, rather than stubbing dead-end rows.
export const settingsCategories: SettingsCategory[] = [
  {
    key: 'account',
    titleKey: 'settings.categories.account',
    iconName: 'business-outline',
    route: '/settings-account',
  },
];
