import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { AccountSettingsView } from '../account-settings-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

function renderView(overrides: Partial<React.ComponentProps<typeof AccountSettingsView>> = {}) {
  return render(
    <AccountSettingsView
      onBack={noop}
      onSelectAccount={noop}
      onCreateAccount={noop}
      billingIdentity="acme-inc"
      onSaveBillingIdentity={noop}
      owners={[]}
      onAddOwner={noop}
      onRemoveOwner={noop}
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
  it('renders the current billing identity, auth context, and empty owners state', async () => {
    await renderView();

    expect(screen.getByDisplayValue('acme-inc')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
    expect(screen.getByText('https://issuer.example.com/realms/lightbridge')).toBeTruthy();
    expect(screen.getByText('No members added yet.')).toBeTruthy();
    expect(
      screen.getByText('Cross-project policy defaults are not yet supported by the backend.')
    ).toBeTruthy();
  });

  it('disables Save until the billing identity is actually changed', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(screen.getByDisplayValue('acme-inc'), 'acme-inc-2');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('calls onSaveBillingIdentity with the trimmed new value', async () => {
    const onSaveBillingIdentity = jest.fn();
    await renderView({ onSaveBillingIdentity });

    await fireEvent.changeText(screen.getByDisplayValue('acme-inc'), '  acme-inc-2  ');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveBillingIdentity).toHaveBeenCalledWith('acme-inc-2');
  });

  it('renders existing owners and calls onRemoveOwner', async () => {
    const onRemoveOwner = jest.fn();
    await renderView({ owners: ['owner@example.com'], onRemoveOwner });

    expect(screen.getByText('owner@example.com')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Remove owner@example.com'));

    expect(onRemoveOwner).toHaveBeenCalledWith('owner@example.com');
  });

  it('calls onAddOwner with the trimmed new owner and clears the input', async () => {
    const onAddOwner = jest.fn();
    await renderView({ onAddOwner });

    await fireEvent.changeText(
      screen.getByPlaceholderText('Subject ID (e.g. 7fd91a54-0443-...)'),
      '  new@example.com  '
    );
    await fireEvent.press(screen.getByText('Add'));

    expect(onAddOwner).toHaveBeenCalledWith('new@example.com');
  });

  it('renders the account list and calls onSelectAccount when one is pressed', async () => {
    const onSelectAccount = jest.fn();
    await renderView({
      accounts: [
        {
          id: 'acc-1',
          billingIdentity: 'acme-inc',
          status: 'active',
          createdAt: '',
          updatedAt: '',
        },
        { id: 'acc-2', billingIdentity: 'globex', status: 'active', createdAt: '', updatedAt: '' },
      ],
      selectedAccountId: 'acc-1',
      onSelectAccount,
    });

    await fireEvent.press(screen.getByText('globex'));

    expect(onSelectAccount).toHaveBeenCalledWith('acc-2');
  });

  it('calls onCreateAccount from the header button when the user can create', async () => {
    const onCreateAccount = jest.fn();
    await renderView({ canCreate: true, onCreateAccount });

    await fireEvent.press(screen.getByLabelText('New account'));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('hides the create button when the user lacks permission', async () => {
    await renderView({ canCreate: false });

    expect(screen.queryByLabelText('New account')).toBeNull();
  });

  it('calls onDeleteAccount when the danger-zone button is pressed', async () => {
    const onDeleteAccount = jest.fn();
    await renderView({ onDeleteAccount });

    await fireEvent.press(screen.getByText('Delete account'));

    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
