import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { DeleteAccountView } from '../delete-account-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('DeleteAccountView', () => {
  it('keeps Delete disabled until the account name is typed exactly', async () => {
    const onConfirm = jest.fn();
    await render(<DeleteAccountView name="acme-inc" onConfirm={onConfirm} onCancel={noop} />);

    const input = screen.getByPlaceholderText('acme-inc');
    const confirmButton = screen.getByRole('button', { name: 'Delete' });

    expect(confirmButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(input, 'acme-in');
    expect(screen.getByRole('button', { name: 'Delete' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(input, 'acme-inc');
    expect(screen.getByRole('button', { name: 'Delete' }).props.accessibilityState.disabled).toBe(
      false
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is pressed', async () => {
    const onCancel = jest.fn();
    await render(<DeleteAccountView name="acme-inc" onConfirm={noop} onCancel={onCancel} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
