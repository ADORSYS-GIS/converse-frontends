import React, { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import {
  useAuthSession,
  useAuthHydration,
  useKeycloakLogin,
  isAuthenticationError,
  getAuthErrorMessage,
} from '@lightbridge/hooks';
import { useRuntimeConfig } from '../configs/runtime-config';
import { LoginView } from '../views/login-view';

export function LoginScreen() {
  const { isAuthenticated } = useAuthSession();
  const { isHydrated } = useAuthHydration();
  const runtimeConfig = useRuntimeConfig();
  const { promptAsync, isLoading, error: authError } = useKeycloakLogin(runtimeConfig.keycloak);
  const router = useRouter();
  // Only the locally-caught error (from `handleLogin`'s own try/catch, below) needs to be actual
  // state -- `authError` is already state owned by `useKeycloakLogin`, so mirroring it into a
  // second piece of state via an effect was the redundant-state antipattern the lint rule flags.
  // `error` (used for rendering) derives `authError` during render instead, falling back to it
  // only while nothing has been caught locally -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [localError, setLocalError] = useState<string | null>(null);
  const error =
    localError ??
    (authError
      ? isAuthenticationError(authError)
        ? authError.getUserMessage()
        : getAuthErrorMessage(authError)
      : null);

  const handleLogin = async () => {
    setLocalError(null);
    try {
      await promptAsync();
    } catch (err) {
      if (isAuthenticationError(err)) {
        setLocalError(err.getUserMessage());
      } else {
        setLocalError(getAuthErrorMessage(err));
      }
    }
  };

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/home');
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || isAuthenticated) {
    return null;
  }

  return (
    <LoginView
      onSsoPress={handleLogin}
      onHelpPress={() => router.push('/help')}
      loading={isLoading}
      error={error}
    />
  );
}
