import React from 'react';
import { AccountSettingsScreen } from '../screens/account-settings-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function SettingsAccountRoute() {
  return (
    <RouteErrorBoundary>
      <AccountSettingsScreen />
    </RouteErrorBoundary>
  );
}
