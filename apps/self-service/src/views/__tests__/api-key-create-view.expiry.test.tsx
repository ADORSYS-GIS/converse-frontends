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

async function typeIntoDateField(text: string) {
  await fireEvent(screen.getByLabelText('Expiration date'), 'change', { target: { value: text } });
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

  it('has no reachable "No expiry" option', async () => {
    await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    expect(screen.queryByText('No expiry')).toBeNull();
  });

  it('sends the resolved date once an in-range custom date is entered', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));
    // 30 days out from the frozen "now" -- inside the allowed [tomorrow, +90 days] window.
    await typeIntoDateField('2026-07-01');
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', '2026-07-01T00:00:00.000Z');
  });

  it('disables Save while "Custom" has no date entered yet', async () => {
    await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));

    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('disables Save when a custom date beyond the 90-day cap is entered', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));
    // 91 days out -- one day past the cap.
    await typeIntoDateField('2026-08-31');

    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
    await fireEvent.press(screen.getByText('Save key'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('disables Save when a custom date in the past is entered', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    await nameField();
    await fireEvent.press(screen.getByText('Custom'));
    await typeIntoDateField('2026-05-01');

    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
    await fireEvent.press(screen.getByText('Save key'));
    expect(onCreate).not.toHaveBeenCalled();
  });
});
