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

  it('is ordered after project and before the budget rows, matching the sequential-delivery order', () => {
    const keys = settingsCategories.map((category) => category.key);
    expect(keys).toEqual(['account', 'project', 'apikey', 'budget', 'budget-review']);
  });
});
