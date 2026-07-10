import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { DeleteProjectView } from '../delete-project-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('DeleteProjectView', () => {
  it('keeps Delete disabled until the project name is typed exactly', async () => {
    const onConfirm = jest.fn();
    await render(<DeleteProjectView name="production" onConfirm={onConfirm} onCancel={noop} />);

    const input = screen.getByPlaceholderText('production');
    const confirmButton = screen.getByRole('button', { name: 'Delete' });

    expect(confirmButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(input, 'productio');
    expect(screen.getByRole('button', { name: 'Delete' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(input, 'production');
    expect(screen.getByRole('button', { name: 'Delete' }).props.accessibilityState.disabled).toBe(
      false
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is pressed', async () => {
    const onCancel = jest.fn();
    await render(<DeleteProjectView name="production" onConfirm={noop} onCancel={onCancel} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
