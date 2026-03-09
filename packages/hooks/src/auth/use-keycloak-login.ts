import { useEffect, useMemo, useRef, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { CodeChallengeMethod } from 'expo-auth-session';

import type { AuthSession as StoredSession } from './auth-types';
import { persistAuthSession } from './use-auth-session';
import { setAuthSession } from './auth-store';

export type KeycloakConfig = {
  issuer: string;
  clientId: string;
  scopes?: string[];
  redirectUri?: string;
  scheme?: string;
};

export async function refreshAccessToken(
  config: KeycloakConfig,
  refreshToken: string
): Promise<StoredSession | null> {
  try {
    const discovery = await AuthSession.fetchDiscoveryAsync(config.issuer);

    if (!discovery.tokenEndpoint) {
      return null;
    }

    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      return null;
    }

    const tokenResult = await response.json();

    const tokens = {
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token || refreshToken,
      idToken: tokenResult.id_token,
      expiresAt: tokenResult.expires_in ? Date.now() + tokenResult.expires_in * 1000 : undefined,
      tokenType: tokenResult.token_type,
      scope: tokenResult.scope,
    };

    let user = null;

    if (discovery.userInfoEndpoint && tokens.accessToken) {
      const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (userInfoResponse.ok) {
        const payload = (await userInfoResponse.json()) as {
          sub: string;
          name?: string;
          preferred_username?: string;
          email?: string;
        };

        user = {
          id: payload.sub,
          name: payload.name ?? payload.preferred_username,
          email: payload.email,
        };
      }
    }

    const session: StoredSession = {
      id: 'current',
      user,
      tokens,
    };

    setAuthSession(session);
    await persistAuthSession(session);

    return session;
  } catch {
    return null;
  }
}

export function useKeycloakLogin(config: KeycloakConfig) {
  const discovery = AuthSession.useAutoDiscovery(config.issuer);
  const redirectUri = useMemo(
    () =>
      config.redirectUri ??
      AuthSession.makeRedirectUri({
        scheme: config.scheme,
        path: 'auth',
      }),
    [config.redirectUri, config.scheme]
  );

  const [isLoading, setIsLoading] = useState(false);
  const processedResponseRef = useRef(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri,
      scopes: config.scopes ?? ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      codeChallengeMethod: CodeChallengeMethod.S256,
    },
    discovery
  );

  useEffect(() => {
    const handleResponse = async () => {
      if (!discovery || response?.type !== 'success' || processedResponseRef.current) {
        return;
      }

      processedResponseRef.current = true;
      setIsLoading(true);

      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: config.clientId,
            code: response.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request?.codeVerifier ?? '',
            },
          },
          discovery
        );

        const tokens = {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          idToken: tokenResult.idToken,
          expiresAt: tokenResult.expiresIn ? Date.now() + tokenResult.expiresIn * 1000 : undefined,
          tokenType: tokenResult.tokenType,
          scope: tokenResult.scope,
        };

        let user = null;

        if (discovery.userInfoEndpoint) {
          const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
            headers: {
              Authorization: `Bearer ${tokenResult.accessToken}`,
            },
          });

          if (userInfoResponse.ok) {
            const payload = (await userInfoResponse.json()) as {
              sub: string;
              name?: string;
              preferred_username?: string;
              email?: string;
            };

            user = {
              id: payload.sub,
              name: payload.name ?? payload.preferred_username,
              email: payload.email,
            };
          }
        }

        const session: StoredSession = {
          id: 'current',
          user,
          tokens,
        };

        setAuthSession(session);
        await persistAuthSession(session);
      } finally {
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [config.clientId, discovery, redirectUri, request?.codeVerifier, response]);

  return {
    request,
    isLoading,
    promptAsync: () => {
      processedResponseRef.current = false;
      return promptAsync();
    },
  };
}
