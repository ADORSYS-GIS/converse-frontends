import { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';

import type { AuthSession } from './auth-types';
import { authSessionCollection, clearAuthSession, setAuthSession } from './auth-store';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './auth-storage';

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

// Check if token is expired or about to expire (with 10 minute buffer)
export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) {
    return false;
  }
  const buffer = Math.min(60 * 1000, Math.max(0, (expiresAt - Date.now()) / 2));
  return Date.now() >= expiresAt - buffer;
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
