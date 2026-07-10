import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export const tabRoutes = [
  { name: 'home', titleKey: 'nav.home' },
  { name: 'api-keys', titleKey: 'nav.apiKeys' },
  { name: 'settings', titleKey: 'nav.settings' },
] as const;

export const tabRouteIcons: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  'api-keys': { active: 'key', inactive: 'key-outline' },
  graphs: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};
