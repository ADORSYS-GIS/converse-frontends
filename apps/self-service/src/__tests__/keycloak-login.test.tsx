import React from 'react';
import { render } from '@testing-library/react-native';

// The end_session_endpoint the mocked discovery advertises.
const END_SESSION_ENDPOINT = 'https://kc.example.com/realms/x/protocol/openid-connect/logout';

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'success' })),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  fetchDiscoveryAsync: jest.fn(),
  useAutoDiscovery: jest.fn(() => null),
  makeRedirectUri: jest.fn(() => 'self-service://login'),
  useAuthRequest: jest.fn(() => [{ codeVerifier: 'verifier' }, null, jest.fn()]),
  exchangeCodeAsync: jest.fn(),
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
}));

// Isolate the unit under test from the persistence layer (TanStack DB /
// IndexedDB / SecureStore), which is ESM and unrelated to what we're asserting.
jest.mock('../../../../packages/hooks/src/auth/use-auth-session', () => ({
  persistAuthSession: jest.fn(),
}));
jest.mock('../../../../packages/hooks/src/auth/auth-store', () => ({
  setAuthSession: jest.fn(),
}));

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  endKeycloakSession,
  useKeycloakLogin,
} from '../../../../packages/hooks/src/auth/use-keycloak-login';

const mockedFetchDiscovery = AuthSession.fetchDiscoveryAsync as jest.Mock;
const mockedUseAuthRequest = AuthSession.useAuthRequest as jest.Mock;
const mockedOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

const CONFIG = {
  issuer: 'https://kc.example.com/realms/x',
  clientId: 'self-service',
  scheme: 'self-service',
};

describe('endKeycloakSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchDiscovery.mockResolvedValue({ endSessionEndpoint: END_SESSION_ENDPOINT });
  });

  it('opens the IdP end_session_endpoint with id_token_hint and post_logout_redirect_uri', async () => {
    await endKeycloakSession(CONFIG, 'the-id-token');

    expect(mockedOpenAuthSession).toHaveBeenCalledTimes(1);
    const [logoutUrl, returnUrl] = mockedOpenAuthSession.mock.calls[0];
    const url = new URL(logoutUrl);

    expect(url.origin + url.pathname).toBe(END_SESSION_ENDPOINT);
    expect(url.searchParams.get('client_id')).toBe('self-service');
    expect(url.searchParams.get('id_token_hint')).toBe('the-id-token');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('self-service://login');
    // The returnUrl handed to the browser must match the post-logout redirect
    // so the session resolves when Keycloak redirects back.
    expect(returnUrl).toBe('self-service://login');
  });

  it('omits id_token_hint when no id token is available', async () => {
    await endKeycloakSession(CONFIG);

    const [logoutUrl] = mockedOpenAuthSession.mock.calls[0];
    expect(new URL(logoutUrl).searchParams.has('id_token_hint')).toBe(false);
  });

  it('prefers an explicit postLogoutRedirectUri over the derived redirect URI', async () => {
    await endKeycloakSession(
      { ...CONFIG, postLogoutRedirectUri: 'https://app.example.com/goodbye' },
      'the-id-token'
    );

    const [logoutUrl, returnUrl] = mockedOpenAuthSession.mock.calls[0];
    expect(new URL(logoutUrl).searchParams.get('post_logout_redirect_uri')).toBe(
      'https://app.example.com/goodbye'
    );
    expect(returnUrl).toBe('https://app.example.com/goodbye');
  });

  it('does nothing at the IdP when the issuer exposes no end_session_endpoint', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedFetchDiscovery.mockResolvedValue({});

    await endKeycloakSession(CONFIG, 'the-id-token');

    expect(mockedOpenAuthSession).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('end_session_endpoint'));
    consoleWarn.mockRestore();
  });
});

describe('useKeycloakLogin scopes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function mount(config: Parameters<typeof useKeycloakLogin>[0]) {
    function Probe() {
      useKeycloakLogin(config);
      return null;
    }
    await render(<Probe />);
  }

  it('requests offline_access by default so the session can be silently refreshed', async () => {
    await mount(CONFIG);

    expect(mockedUseAuthRequest).toHaveBeenCalled();
    const [requestConfig] = mockedUseAuthRequest.mock.calls[0];
    expect(requestConfig.scopes).toEqual(['openid', 'profile', 'email', 'offline_access']);
  });

  it('honors explicit scopes from config', async () => {
    await mount({ ...CONFIG, scopes: ['openid', 'custom'] });

    const [requestConfig] = mockedUseAuthRequest.mock.calls[0];
    expect(requestConfig.scopes).toEqual(['openid', 'custom']);
  });
});
