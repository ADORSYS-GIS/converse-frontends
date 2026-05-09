import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export const tabRoutes = [
  { name: 'home', titleKey: 'nav.home' },
  { name: 'api-keys', titleKey: 'nav.apiKeys' },
  { name: 'mcp', titleKey: 'nav.apiKeyEditor' },
  { name: 'usage', titleKey: 'nav.usage' },
] as const;

export const tabRouteIcons: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  'api-keys': { active: 'key', inactive: 'key-outline' },
  mcp: { active: 'options', inactive: 'options-outline' },
  usage: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  graphs: { active: 'bar-chart', inactive: 'bar-chart-outline' },
};
