import React, { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { useAuthSession, useAuthHydration, useKeycloakLogin, isAuthenticationError, getAuthErrorMessage } from '@lightbridge/hooks';
import { useRuntimeConfig } from '../configs/runtime-config';
import { LoginView } from '../views/login-view';

export function LoginScreen() {
  const { isAuthenticated } = useAuthSession();
  const { isHydrated } = useAuthHydration();
  const runtimeConfig = useRuntimeConfig();
  const { promptAsync, isLoading } = useKeycloakLogin(runtimeConfig.keycloak);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await promptAsync();
    } catch (err) {
      if (isAuthenticationError(err)) {
        setError(err.getUserMessage());
      } else {
        setError(getAuthErrorMessage(err));
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
