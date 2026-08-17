import React from 'react';
import { SettingsScreen } from '../../screens/settings-screen';
import { RouteErrorBoundary } from '../../components/route-error-boundary';

export default function SettingsRoute() {
  return (
    <RouteErrorBoundary>
      <SettingsScreen />
    </RouteErrorBoundary>
  );
}
