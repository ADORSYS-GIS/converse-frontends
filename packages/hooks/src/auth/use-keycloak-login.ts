import { useEffect, useMemo, useRef, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { CodeChallengeMethod } from 'expo-auth-session';

import type { AuthSession as StoredSession, AudienceConfig } from './auth-types';
import { persistAuthSession } from './use-auth-session';
import { setAuthSession } from './auth-store';
import { decodeJwt, getJwtAudience, validateJwtAudience } from './jwt-utils';
import { createAudienceError, isAuthenticationError } from './auth-errors';

export type KeycloakConfig = {
  issuer: string;
  clientId: string;
  scopes?: string[];
  redirectUri?: string;
  scheme?: string;
  /** JWT audience validation configuration */
  audience?: AudienceConfig;
};

/**
 * Extracts and validates audience from a JWT access token
 * Returns the audience claim and validation result
 */
function extractAndValidateAudience(
  accessToken: string,
  audienceConfig?: AudienceConfig
): { audience: string[] | undefined; valid: boolean; errors: string[] } {
  // If audience validation is disabled or not configured, skip validation
  if (audienceConfig?.enabled === false) {
    return { audience: getJwtAudience(accessToken) ?? undefined, valid: true, errors: [] };
  }

  // If expected audience is configured, validate it
  if (audienceConfig?.expectedAudience) {
    const result = validateJwtAudience(accessToken, {
      expectedAudience: audienceConfig.expectedAudience,
      allowMissingAudience: audienceConfig.allowMissingAudience,
      checkExpiration: false, // Expiration checked separately
    });

    return {
      audience: result.payload?.aud ? (Array.isArray(result.payload.aud) ? result.payload.aud : [result.payload.aud]) : undefined,
      valid: result.valid,
      errors: result.errors,
    };
  }

  // No audience config, just extract audience without validation
  return { audience: getJwtAudience(accessToken) ?? undefined, valid: true, errors: [] };
}

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
      const errorText = await response.text();
      console.error(
        `[Auth] Token refresh failed with status ${response.status}:`,
        errorText || 'No error details provided'
      );
      return null;
    }

    const tokenResult = await response.json();

    // Extract and validate audience from the access token
    const audienceResult = extractAndValidateAudience(tokenResult.access_token, config.audience);

    if (!audienceResult.valid) {
      console.error('[Auth] JWT audience validation failed during token refresh:', audienceResult.errors);
      // Block authentication - audience mismatch means token is not intended for this client
      throw createAudienceError(audienceResult.errors);
    }

    const tokens = {
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token || refreshToken,
      idToken: tokenResult.id_token,
      expiresAt: tokenResult.expires_in ? Date.now() + tokenResult.expires_in * 1000 : undefined,
      tokenType: tokenResult.token_type,
      scope: tokenResult.scope,
      audience: audienceResult.audience,
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
  } catch (error) {
    console.error('[Auth] Unexpected error during token refresh:', error);
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
  const [error, setError] = useState<Error | null>(null);
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
        console.log('[Auth] Exchanging code for tokens:', {
          clientId: config.clientId,
          redirectUri,
          code: response.params.code ? 'PRESENT' : 'MISSING',
        });

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

        // Extract and validate audience from the access token
        const audienceResult = extractAndValidateAudience(tokenResult.accessToken, config.audience);

        if (!audienceResult.valid) {
          console.error('[Auth] JWT audience validation failed during login:', audienceResult.errors);
          // Block authentication - audience mismatch means token is not intended for this client
          throw createAudienceError(audienceResult.errors);
        } else if (audienceResult.audience) {
          console.log('[Auth] JWT audience validated:', audienceResult.audience);
        }

        const tokens = {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          idToken: tokenResult.idToken,
          expiresAt: tokenResult.expiresIn ? Date.now() + tokenResult.expiresIn * 1000 : undefined,
          tokenType: tokenResult.tokenType,
          scope: tokenResult.scope,
          audience: audienceResult.audience,
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
        console.log('[Auth] Login successful and session persisted');
      } catch (err: any) {
        console.error('[Auth] Login failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [config.clientId, discovery, redirectUri, request?.codeVerifier, response]);

  return {
    request,
    isLoading,
    error,
    promptAsync: () => {
      processedResponseRef.current = false;
      setError(null);
      return promptAsync();
    },
  };
}
