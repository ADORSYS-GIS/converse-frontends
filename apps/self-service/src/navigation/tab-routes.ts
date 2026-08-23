import type { IconName } from '@lightbridge/ui';
import type { Permission } from '@lightbridge/hooks';

type FeatherIconName = IconName;

export type TabRoute = {
  name: string;
  titleKey: string;
  /** When set, the tab is only shown to a caller who holds this permission. */
  requiredPermission?: Permission;
};

/**
 * The ADR 0008 Decision 4 nav spine: exactly `Overview · Api-Keys · Manage · Admin`. This is an
 * information-architecture constraint, not a styling choice — every screen in the app nests
 * inside one of these four top-level destinations. `Admin` carries `requiredPermission`, so a
 * non-admin caller sees three items and an admin sees four (`responsive-tab-bar.tsx` filters on
 * it via `usePermissions().has(...)`, the same mechanism `settings-categories.ts` already uses
 * for its own permission-gated rows — no second gating mechanism).
 *
 * `budget:review` is only ever granted to the `lightbridge-admin` role in
 * `packages/hooks/src/rbac.ts`'s `DEFAULT_ROLE_PERMISSIONS`, so it stands in for "holds the admin
 * role" without this client-side file needing to read raw JWT role strings itself.
 *
 * `route.name` values are expo-router file names under `app/(tabs)/` — keep them in sync with
 * that directory. `usage` is deliberately absent here: ADR 0008 folds it into `Overview` (its
 * dashboard follow-up hasn't landed yet, so today that's a "Usage" quick action on the Overview
 * screen instead — see `views/home-view.tsx`), and `settings` used to also host the admin-only
 * "budget review" category, which moved to `Admin` (`screens/admin-screen.tsx`).
 */
export const tabRoutes: readonly TabRoute[] = [
  { name: 'home', titleKey: 'nav.home' },
  { name: 'api-keys', titleKey: 'nav.apiKeys' },
  { name: 'settings', titleKey: 'nav.manage' },
  { name: 'admin', titleKey: 'nav.admin', requiredPermission: 'budget:review' },
];

// Feather is single-weight (no filled/outline pairs), so active vs inactive
// tabs are distinguished by tint color alone, not by swapping icons.
export const tabRouteIcons: Record<string, FeatherIconName> = {
  home: 'home',
  'api-keys': 'key',
  settings: 'settings',
  admin: 'shield',
};
