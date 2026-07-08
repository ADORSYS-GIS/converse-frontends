import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

// useCopyToClipboard reaches for navigator.clipboard / document, which the RN
// (node) test environment doesn't provide. Stub the write; this test covers the
// onCopy callback and the copied-state affordance, not the browser clipboard API.
jest.mock('@uidotdev/usehooks', () => ({
  useCopyToClipboard: () => [null, jest.fn().mockResolvedValue(undefined)],
}));

import { OneTimeSecretCard } from '../components/one-time-secret-card';

beforeAll(() => {
  initI18n('en');
});

describe('OneTimeSecretCard', () => {
  it('renders the secret and calls onCopy with it when the copy button is pressed', async () => {
    const onCopy = jest.fn();
    await render(<OneTimeSecretCard secret="TEST-FIXTURE-SECRET-VALUE" onCopy={onCopy} />);

    expect(screen.getByText('TEST-FIXTURE-SECRET-VALUE')).toBeTruthy();

    await fireEvent.press(screen.getByText('Copy API key'));

    expect(onCopy).toHaveBeenCalledWith('TEST-FIXTURE-SECRET-VALUE');
    expect(screen.getByText('Copied!')).toBeTruthy();
  });
});
