import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { RotateApiKeyView } from '../rotate-api-key-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('RotateApiKeyView', () => {
  it('shows the confirm stage with the key name and calls onConfirm when confirmed', async () => {
    const onConfirm = jest.fn();
    await render(
      <RotateApiKeyView keyName="Production" onBack={noop} onConfirm={onConfirm} onCopy={noop} />
    );

    expect(screen.getByText('Production')).toBeTruthy();

    await fireEvent.press(screen.getByText('Rotate key'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm/cancel buttons while rotating', async () => {
    await render(
      <RotateApiKeyView
        keyName="Production"
        onBack={noop}
        onConfirm={noop}
        onCopy={noop}
        isRotating
      />
    );

    expect(screen.getByText('Rotating...')).toBeTruthy();
  });

  it('shows the one-time secret once rotation succeeds', async () => {
    await render(
      <RotateApiKeyView
        keyName="Production"
        onBack={noop}
        onConfirm={noop}
        onCopy={noop}
        generatedSecret="TEST-FIXTURE-ROTATED-SECRET"
      />
    );

    expect(screen.getByText('TEST-FIXTURE-ROTATED-SECRET')).toBeTruthy();
    expect(screen.queryByText('Rotate key')).toBeNull();
  });
});
