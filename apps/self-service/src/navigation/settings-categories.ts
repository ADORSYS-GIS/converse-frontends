import type { IconName } from '@lightbridge/ui';
import type { Permission } from '@lightbridge/hooks';

type FeatherIconName = IconName;

export type SettingsCategoryKey = 'account' | 'project' | 'apikey' | 'budget' | 'budget-review';

export type SettingsCategory = {
  key: SettingsCategoryKey;
  titleKey: string;
  iconName: FeatherIconName;
  route: `/${string}`;
  /**
   * When set, the category is only shown to a caller who holds this permission (#148). Which
   * role(s) should carry `budget:self-refill`/`budget:review` was unresolved-by-role as of
   * ADORSYS-GIS/lightbridge-authz#294; that resolved via lightbridge-authz#325, which granted
   * `budget:self-refill` to `lightbridge-editor` (not `lightbridge-viewer`) in prod's
   * `oauth2.rbac.role_permissions`, mirrored into `DEFAULT_ROLE_PERMISSIONS`
   * (`packages/hooks/src/rbac.ts`). `budget:review` is still admin-only, so the "Budget review"
   * row stays hidden for editor/viewer. `account`/`project`/`apikey` have no gate: every
   * authenticated caller can reach them (the detail screen itself hides individual actions per
   * `apikey:*` grants, same as the account/project screens do for their own danger-zone
   * actions).
   */
  requiredPermission?: Permission;
};

// #55 was delivered as sequential PRs per its own risk note: account, then project, then this
// api-key row last — only list categories that actually have a working detail screen, rather
// than stubbing dead-end rows. All three ADR 0001 settings surfaces are now present.
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
  {
    key: 'apikey',
    titleKey: 'settings.categories.apiKeys',
    iconName: 'key',
    route: '/settings-api-key',
  },
  {
    key: 'budget',
    titleKey: 'settings.categories.budget',
    iconName: 'dollar-sign',
    route: '/settings-budget',
    requiredPermission: 'budget:self-refill',
  },
  {
    key: 'budget-review',
    titleKey: 'settings.categories.budgetReview',
    iconName: 'inbox',
    route: '/settings-budget-review',
    requiredPermission: 'budget:review',
  },
];
