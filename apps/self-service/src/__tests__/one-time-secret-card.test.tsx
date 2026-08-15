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

  it('renders no oauth2Url section when the prop is absent (baseline unchanged)', async () => {
    await render(
      <OneTimeSecretCard secret="TEST-FIXTURE-SECRET-VALUE" onCopy={jest.fn()} />
    );

    expect(screen.queryByText('OAuth2 token endpoint:')).toBeNull();
  });

  it('renders no oauth2Url section when the prop is an empty string', async () => {
    await render(
      <OneTimeSecretCard secret="TEST-FIXTURE-SECRET-VALUE" onCopy={jest.fn()} oauth2Url="" />
    );
    expect(screen.queryByText('OAuth2 token endpoint:')).toBeNull();
  });

  it('renders no oauth2Url section when the prop is a malformed URL', async () => {
    await render(
      <OneTimeSecretCard
        secret="TEST-FIXTURE-SECRET-VALUE"
        onCopy={jest.fn()}
        oauth2Url="not-a-url"
      />
    );
    expect(screen.queryByText('OAuth2 token endpoint:')).toBeNull();
  });

  it('renders the oauth2Url, labeled and selectable, when the backend returns one', async () => {
    await render(
      <OneTimeSecretCard
        secret="TEST-FIXTURE-SECRET-VALUE"
        onCopy={jest.fn()}
        oauth2Url="https://auth.example.com/oauth2/token"
      />
    );

    expect(screen.getByText('OAuth2 token endpoint:')).toBeTruthy();
    expect(screen.getByText('https://auth.example.com/oauth2/token')).toBeTruthy();
  });
});
