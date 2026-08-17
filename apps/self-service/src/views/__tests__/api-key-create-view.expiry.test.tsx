import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { ApiKeyCreateView } from '../api-key-create-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

afterEach(() => {
  jest.useRealTimers();
});

async function nameField() {
  return fireEvent.changeText(screen.getByPlaceholderText('Production'), 'CI key');
}

describe('ApiKeyCreateView expiry', () => {
  it('defaults to a 30-days-out expiresAt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', '2026-07-01T00:00:00.000Z');
  });

  it('sends explicit null (not omitted) when "No expiry" is chosen', async () => {
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('No expiry'));
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', null);
  });

  it('sends the resolved date once a custom date is entered', async () => {
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));
    await fireEvent(screen.getByLabelText('Expiration date'), 'change', {
      target: { value: '2026-12-31' },
    });
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', '2026-12-31T00:00:00.000Z');
  });

  it('disables Save while "Custom" has no date entered yet', async () => {
    await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));

    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
  });
});
