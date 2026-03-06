import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';

import type { AuthSession } from './auth-types';
import { authSessionCollection, clearAuthSession, setAuthSession } from './auth-store';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './auth-storage';

// Global state to track if auth is ready for API calls
let isAuthReady = false;

export function setAuthReady(ready: boolean) {
  isAuthReady = ready;
}

export function getAuthReady(): boolean {
  return isAuthReady;
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

  return { session, isAuthenticated };
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
  const { isHydrated } = useAuthHydration();
  return isHydrated;
}

export async function persistAuthSession(session: AuthSession) {
  await saveStoredSession(session);
}

export async function clearPersistedAuthSession() {
  clearAuthSession();
  await clearStoredSession();
}
