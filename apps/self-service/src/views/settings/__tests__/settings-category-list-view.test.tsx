import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { SettingsCategoryListView } from '../settings-category-list-view';
import { settingsCategories } from '../../../navigation/settings-categories';

beforeAll(() => {
  initI18n('en');
});

describe('SettingsCategoryListView', () => {
  it('renders each category label', async () => {
    await render(
      <SettingsCategoryListView categories={settingsCategories} onSelect={() => undefined} />
    );

    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('calls onSelect with the pressed category', async () => {
    const onSelect = jest.fn();
    await render(<SettingsCategoryListView categories={settingsCategories} onSelect={onSelect} />);

    await fireEvent.press(screen.getByText('Account'));

    expect(onSelect).toHaveBeenCalledWith(settingsCategories[0]);
  });

  it('marks the active category as selected in rail variant', async () => {
    await render(
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
    await render(
      <SettingsCategoryListView categories={settingsCategories} onSelect={() => undefined} />
    );

    expect(screen.getByLabelText('Account').props.accessibilityState.selected).toBe(false);
  });
});
