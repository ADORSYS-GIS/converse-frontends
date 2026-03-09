import React from 'react';

import { useRouter } from 'expo-router';
import { useAuthSession, useKeycloakLogin } from '@lightbridge/hooks';
import { useRuntimeConfig } from '../configs/runtime-config';
import { LoginView } from '../views/login-view';

export function LoginScreen() {
  const { isAuthenticated } = useAuthSession();
  const runtimeConfig = useRuntimeConfig();
  const { promptAsync, isLoading } = useKeycloakLogin(runtimeConfig.keycloak);
  const router = useRouter();

  if (isAuthenticated) {
    return null;
  }

  return (
    <LoginView
      onSsoPress={() => promptAsync()}
      onHelpPress={() => router.push('/help')}
      loading={isLoading}
    />
  );
}
