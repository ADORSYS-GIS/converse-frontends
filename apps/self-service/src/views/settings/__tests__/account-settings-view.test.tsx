import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { AccountSettingsView } from '../account-settings-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

/*
 * This suite shrank with lightbridge-authz ADR-0006. The account surface lost its members roster
 * (membership is per project now), its "set as default" action (one account per person leaves
 * nothing to default away from), its billing identity (moved to the project) and its create-account
 * form (the account is auto-provisioned on first sign-in). The tests covering those went with them
 * — their replacements live with the project settings surface.
 */
function renderView(overrides: Partial<React.ComponentProps<typeof AccountSettingsView>> = {}) {
  return render(
    <AccountSettingsView
      onBack={noop}
      onSelectAccount={noop}
      defaultQuota="t-m"
      onSaveDefaultQuota={noop}
      authIssuer="https://issuer.example.com/realms/lightbridge"
      authUserLabel="jane@example.com"
      onDeleteAccount={noop}
      onSuspendAccount={noop}
      onEnableAccount={noop}
      {...overrides}
    />
  );
}

describe('AccountSettingsView', () => {
  it('renders the current usage tier and auth context', async () => {
    await renderView();

    expect(screen.getByDisplayValue('t-m')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
    expect(screen.getByText('https://issuer.example.com/realms/lightbridge')).toBeTruthy();
    expect(
      screen.getByText('Cross-project policy defaults are not yet supported by the backend.')
    ).toBeTruthy();
  });

  it('disables Save until the usage tier is actually changed', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(screen.getByDisplayValue('t-m'), 't-xs');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('calls onSaveDefaultQuota with the trimmed new value', async () => {
    const onSaveDefaultQuota = jest.fn();
    await renderView({ onSaveDefaultQuota });

    await fireEvent.changeText(screen.getByDisplayValue('t-m'), '  t-xs  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveDefaultQuota).toHaveBeenCalledWith('t-xs');
  });

  it('allows clearing the usage tier back to empty', async () => {
    const onSaveDefaultQuota = jest.fn();
    await renderView({ onSaveDefaultQuota });

    await fireEvent.changeText(screen.getByDisplayValue('t-m'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveDefaultQuota).toHaveBeenCalledWith('');
  });

  it('renders the account list and calls onSelectAccount when one is pressed', async () => {
    const onSelectAccount = jest.fn();
    await renderView({
      accounts: [
        {
          id: 'acc-1',
          defaultQuota: 't-m',
          status: 'active',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'acc-2',
          defaultQuota: undefined,
          status: 'active',
          createdAt: '',
          updatedAt: '',
        },
      ],
      selectedAccountId: 'acc-1',
      onSelectAccount,
    });

    await fireEvent.press(screen.getByText('acc-2'));

    expect(onSelectAccount).toHaveBeenCalledWith('acc-2');
  });

  it('calls onDeleteAccount when the danger-zone button is pressed', async () => {
    const onDeleteAccount = jest.fn();
    await renderView({ onDeleteAccount });

    await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('leaves Delete enabled — no account is undeletable any more', async () => {
    await renderView();

    expect(
      screen.getByRole('button', { name: 'Delete account' }).props.accessibilityState.disabled
    ).toBeFalsy();
  });

  it('hides the danger zone when the user lacks delete permission', async () => {
    await renderView({ canDelete: false });

    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });
});
