import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../../packages/hooks/src/auth/use-auth-session', () => ({
  clearPersistedAuthSession: jest.fn(() => Promise.resolve()),
  getLatestAuthSession: jest.fn(() => ({ tokens: { idToken: 'idt-1' } })),
}));
jest.mock('../../../../packages/hooks/src/auth/use-keycloak-login', () => ({
  endKeycloakSession: jest.fn(() => Promise.resolve()),
}));

import { useSignOut } from '../../../../packages/hooks/src/auth/use-sign-out';
import {
  clearPersistedAuthSession,
  getLatestAuthSession,
} from '../../../../packages/hooks/src/auth/use-auth-session';
import { endKeycloakSession } from '../../../../packages/hooks/src/auth/use-keycloak-login';

const mockClear = clearPersistedAuthSession as jest.Mock;
const mockGetLatest = getLatestAuthSession as jest.Mock;
const mockEndSession = endKeycloakSession as jest.Mock;

const CONFIG = {
  issuer: 'https://kc.example.com/realms/x',
  clientId: 'self-service',
  scheme: 'self-service',
};

async function mountSignOut(config?: Parameters<typeof useSignOut>[0]) {
  const box: { current: ReturnType<typeof useSignOut> } = {
    current: undefined as never,
  };
  function Probe() {
    box.current = useSignOut(config);
    return null;
  }
  await render(<Probe />);
  return box;
}

describe('useSignOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatest.mockReturnValue({ tokens: { idToken: 'idt-1' } });
    mockEndSession.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
  });

  it('ends the Keycloak session with the current id token, then clears local state', async () => {
    const box = await mountSignOut(CONFIG);
    await box.current.signOut();

    expect(mockEndSession).toHaveBeenCalledWith(CONFIG, 'idt-1');
    expect(mockClear).toHaveBeenCalledTimes(1);
    // IdP end-session must run before the local token object is cleared, so the
    // id token is still available as the id_token_hint.
    expect(mockEndSession.mock.invocationCallOrder[0]).toBeLessThan(
      mockClear.mock.invocationCallOrder[0]
    );
  });

  it('still clears local state when the IdP end-session fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEndSession.mockRejectedValue(new Error('keycloak unreachable'));

    const box = await mountSignOut(CONFIG);
    await expect(box.current.signOut()).resolves.toBeUndefined();

    expect(mockClear).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('skips the IdP round-trip when no issuer config is provided', async () => {
    const box = await mountSignOut();
    await box.current.signOut();

    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalledTimes(1);
  });
});
