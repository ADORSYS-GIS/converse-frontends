import React from 'react';
import { ApiKeyCreateScreen } from '../../screens/api-key-create-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function ApiKeyCreateRoute() {
  return (
    <RouteErrorBoundary>
      <ApiKeyCreateScreen />
    </RouteErrorBoundary>
  );
}
