import { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';

import type { AuthSession, AudienceConfig } from './auth-types';
import { authSessionCollection, clearAuthSession, setAuthSession } from './auth-store';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './auth-storage';
import { validateJwtAudience, getJwtAudience } from './jwt-utils';

let isAuthReady = false;
const authReadyListeners = new Set<() => void>();

function subscribeToAuthReady(listener: () => void) {
  authReadyListeners.add(listener);
  return () => authReadyListeners.delete(listener);
}

export function setAuthReady(ready: boolean) {
  isAuthReady = ready;
  authReadyListeners.forEach((l) => l());
}

export function getAuthReady(): boolean {
  return isAuthReady;
}

export function getLatestAuthSession(): AuthSession {
  const data = authSessionCollection.get('current');
  return (
    data ?? {
      id: 'current',
      user: null,
      tokens: null,
    }
  );
}

// Check if token is expired or about to expire.
// Uses a dynamic buffer that scales with remaining time (up to 60 s),
// with a 30 s floor so short-lived tokens still have enough lead time
// for a refresh round-trip.
export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) {
    return false;
  }
  const remaining = expiresAt - Date.now();
  const buffer = Math.min(60 * 1000, Math.max(30 * 1000, remaining / 2));
  return Date.now() >= expiresAt - buffer;
}

/**
 * Validates the audience claim in the stored access token
 * Returns validation result with any errors
 */
export function validateStoredTokenAudience(
  accessToken: string,
  audienceConfig?: AudienceConfig
): { valid: boolean; audience: string[] | undefined; errors: string[] } {
  // If audience validation is disabled or not configured, skip validation
  if (audienceConfig?.enabled === false) {
    return {
      audience: getJwtAudience(accessToken) ?? undefined,
      valid: true,
      errors: []
    };
  }

  // If expected audience is configured, validate it
  if (audienceConfig?.expectedAudience) {
    const result = validateJwtAudience(accessToken, {
      expectedAudience: audienceConfig.expectedAudience,
      allowMissingAudience: audienceConfig.allowMissingAudience,
      checkExpiration: false, // Expiration checked separately
    });

    const rawAud = result.payload?.aud;
    const audience = rawAud
      ? (Array.isArray(rawAud) ? rawAud : [rawAud])
      : undefined;

    return {
      audience,
      valid: result.valid,
      errors: result.errors,
    };
  }

  // No audience config, just extract audience without validation
  return {
    audience: getJwtAudience(accessToken) ?? undefined,
    valid: true,
    errors: []
  };
}

export function useAuthSession() {
  const { data } = useLiveQuery((q) => q.from({ auth: authSessionCollection }));

  const session = useMemo<AuthSession>(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as AuthSession;
    }
    return { id: 'current', user: null, tokens: null };
  }, [data]);

  const isAuthenticated = Boolean(
    session.tokens?.accessToken || session.tokens?.idToken || session.tokens?.refreshToken
  );

  const isTokenValid = useMemo(() => {
    return isAuthenticated && !isTokenExpired(session.tokens?.expiresAt);
  }, [isAuthenticated, session.tokens?.expiresAt]);

  const isTokenExpiredResult = useMemo(() => {
    return isAuthenticated && isTokenExpired(session.tokens?.expiresAt);
  }, [isAuthenticated, session.tokens?.expiresAt]);

  return {
    session,
    isAuthenticated,
    isTokenValid,
    isTokenExpired: isTokenExpiredResult,
  };
}

export function useAuthHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const stored = await loadStoredSession();
        const hasTokens = Boolean(
          stored?.tokens?.accessToken || stored?.tokens?.idToken || stored?.tokens?.refreshToken
        );

        if (stored && hasTokens) {
          setAuthSession(stored);
        } else {
          clearAuthSession();
        }
      } finally {
        if (isMounted) {
          setIsHydrated(true);
          setAuthReady(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isHydrated };
}

// Hook that can be used to ensure auth is hydrated before proceeding
export function useEnsureHydrated() {
  const { isHydrated } = useAuthHydration();
  return isHydrated;
}

// Reactive hook to check if auth is ready for API calls
export function useAuthReady() {
  return useSyncExternalStore(subscribeToAuthReady, getAuthReady, getAuthReady);
}

export async function persistAuthSession(session: AuthSession) {
  await saveStoredSession(session);
}

export async function clearPersistedAuthSession() {
  clearAuthSession();
  await clearStoredSession();
}
