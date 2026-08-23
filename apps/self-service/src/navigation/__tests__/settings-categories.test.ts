import { settingsCategories } from '../settings-categories';

describe('settingsCategories — apikey entry (#55)', () => {
  const apiKeyCategory = settingsCategories.find((category) => category.key === 'apikey');

  it('is present, following the same shape as account/project', () => {
    expect(apiKeyCategory).toEqual({
      key: 'apikey',
      titleKey: 'settings.categories.apiKeys',
      iconName: 'key',
      route: '/settings-api-key',
    });
  });

  it('carries no requiredPermission — every authenticated caller can reach the category, same as account/project', () => {
    expect(apiKeyCategory?.requiredPermission).toBeUndefined();
  });

  it('is ordered after project and before the budget row, matching the sequential-delivery order', () => {
    const keys = settingsCategories.map((category) => category.key);
    expect(keys).toEqual(['account', 'project', 'apikey', 'budget']);
  });

  // ADR 0008: "Manage" (this list) is the non-admin-exclusive nav group now — the admin-only
  // `budget-review` category moved out to the new `Admin` nav-spine group, so this list must
  // never regain an entry gated on `budget:review` (that would put admin-only content back in
  // a group every non-admin caller can otherwise reach).
  it('carries no entry gated on budget:review (admin-only) — that moved to the Admin nav group', () => {
    const reviewCategory = settingsCategories.find(
      (category) => category.requiredPermission === 'budget:review'
    );
    expect(reviewCategory).toBeUndefined();
  });
});
