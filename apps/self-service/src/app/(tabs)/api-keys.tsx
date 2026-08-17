import React from 'react';

import { ApiKeysScreen } from '../../screens/api-keys-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function ApiKeysRoute() {
  return (
    <RouteErrorBoundary>
      <ApiKeysScreen />
    </RouteErrorBoundary>
  );
}
