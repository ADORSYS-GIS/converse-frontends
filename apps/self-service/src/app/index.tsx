import React from 'react';
import { Redirect } from 'expo-router';

import { useAuthSession } from '@lightbridge/hooks';

export default function IndexRoute() {
  const { isAuthenticated } = useAuthSession();

  return <Redirect href={isAuthenticated ? '/home' : '/login'} />;
}
