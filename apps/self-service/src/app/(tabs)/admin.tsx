import React from 'react';

import { AdminScreen } from '../../screens/admin-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function AdminRoute() {
  return (
    <RouteErrorBoundary>
      <AdminScreen />
    </RouteErrorBoundary>
  );
}
