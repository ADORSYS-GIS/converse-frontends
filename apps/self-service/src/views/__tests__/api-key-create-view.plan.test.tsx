import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { ApiKeyCreateView } from '../api-key-create-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('ApiKeyCreateView billing plan gating', () => {
  it('creates keys on the free plan when the user cannot choose a plan', async () => {
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    // No plan field is offered; a locked note explains the fixed plan instead.
    expect(screen.queryByText('Billing plan')).toBeNull();
    expect(screen.getByText('New keys are created on the free plan.')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'CI key');
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free');
  });

  it('lets an account member pick a plan and forwards it', async () => {
    const onCreate = jest.fn();
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} canChoosePlan />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await fireEvent.changeText(screen.getByPlaceholderText('free'), 'pro');
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('Prod key', 'pro');
  });

  it('defaults an account member to the free plan when the field is left blank', async () => {
    const onCreate = jest.fn();
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} canChoosePlan />
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'Prod key');
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('Prod key', 'free');
  });
});
