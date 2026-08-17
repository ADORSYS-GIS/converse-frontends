import React from 'react';
import { ProjectSettingsScreen } from '../screens/project-settings-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function SettingsProjectRoute() {
  return (
    <RouteErrorBoundary>
      <ProjectSettingsScreen />
    </RouteErrorBoundary>
  );
}
