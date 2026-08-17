import React from 'react';

import { LoginScreen } from '../../screens/login-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function LoginRoute() {
  return (
    <RouteErrorBoundary>
      <LoginScreen />
    </RouteErrorBoundary>
  );
}
