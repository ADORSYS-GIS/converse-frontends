import React from 'react';

import { HomeScreen } from '../../screens/home-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function HomeRoute() {
  return (
    <RouteErrorBoundary>
      <HomeScreen />
    </RouteErrorBoundary>
  );
}
