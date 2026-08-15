import type { IconName } from '@lightbridge/ui';
import type { Permission } from '@lightbridge/hooks';

type FeatherIconName = IconName;

export type SettingsCategoryKey = 'account' | 'project' | 'budget' | 'budget-review';

export type SettingsCategory = {
  key: SettingsCategoryKey;
  titleKey: string;
  iconName: FeatherIconName;
  route: `/${string}`;
  /**
   * When set, the category is only shown to a caller who holds this permission (#148) --
   * `budget:self-refill`/`budget:review` are unresolved-by-role as of ADORSYS-GIS/
   * lightbridge-authz#294, so both budget rows must stay hidden by default rather than shown to
   * everyone. `account`/`project` have no gate: every authenticated caller can reach them.
   */
  requiredPermission?: Permission;
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
