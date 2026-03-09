import React from 'react';
import { Redirect } from 'expo-router';

import { useAuthSession, useAuthHydration } from '@lightbridge/hooks';

export default function IndexRoute() {
  const { isAuthenticated } = useAuthSession();
  const { isHydrated } = useAuthHydration();

  if (!isHydrated) {
    return null;
  }

  return <Redirect href={isAuthenticated ? '/home' : '/login'} />;
}
