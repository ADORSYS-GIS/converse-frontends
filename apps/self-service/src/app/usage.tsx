import React from 'react';

import { UsageScreen } from '../screens/usage-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function UsageRoute() {
  return (
    <RouteErrorBoundary>
      <UsageScreen />
    </RouteErrorBoundary>
  );
}
