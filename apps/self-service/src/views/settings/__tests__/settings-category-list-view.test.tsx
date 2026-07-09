import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { SettingsCategoryListView } from '../settings-category-list-view';
import { settingsCategories } from '../../../navigation/settings-categories';
import { ThemePreferenceProvider } from '../../../theme/theme-preference';

beforeAll(() => {
  initI18n('en');
});

// The view now embeds <ThemeToggle/>, which reads the ThemePreference context.
const renderView = (ui: React.ReactElement) =>
  render(ui, { wrapper: ThemePreferenceProvider });

describe('SettingsCategoryListView', () => {
  it('renders each category label', async () => {
    await renderView(
      <SettingsCategoryListView categories={settingsCategories} onSelect={() => undefined} />
    );

    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('calls onSelect with the pressed category', async () => {
    const onSelect = jest.fn();
    await renderView(
      <SettingsCategoryListView categories={settingsCategories} onSelect={onSelect} />
    );

    await fireEvent.press(screen.getByText('Account'));

    expect(onSelect).toHaveBeenCalledWith(settingsCategories[0]);
  });

  it('marks the active category as selected in rail variant', async () => {
    await renderView(
      <SettingsCategoryListView
        categories={settingsCategories}
        activeKey="account"
        onSelect={() => undefined}
        variant="rail"
      />
    );

    expect(screen.getByLabelText('Account').props.accessibilityState.selected).toBe(true);
  });

  it('does not mark any category as selected in list variant (no activeKey)', async () => {
    await renderView(
      <SettingsCategoryListView categories={settingsCategories} onSelect={() => undefined} />
    );

    expect(screen.getByLabelText('Account').props.accessibilityState.selected).toBe(false);
  });
});
