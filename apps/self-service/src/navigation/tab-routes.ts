import type { IconName } from '@lightbridge/ui';

type FeatherIconName = IconName;

export const tabRoutes = [
  { name: 'home', titleKey: 'nav.home' },
  { name: 'api-keys', titleKey: 'nav.apiKeys' },
  { name: 'usage', titleKey: 'nav.usage' },
  { name: 'settings', titleKey: 'nav.settings' },
] as const;

// Feather is single-weight (no filled/outline pairs), so active vs inactive
// tabs are distinguished by tint color alone, not by swapping icons.
export const tabRouteIcons: Record<string, FeatherIconName> = {
  home: 'home',
  'api-keys': 'key',
  usage: 'bar-chart-2',
  settings: 'settings',
};
