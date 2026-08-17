import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';

import { HelpScreen } from '../screens/help-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function HelpRoute() {
  useTranslation();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <RouteErrorBoundary>
        <HelpScreen />
      </RouteErrorBoundary>
    </>
  );
}
