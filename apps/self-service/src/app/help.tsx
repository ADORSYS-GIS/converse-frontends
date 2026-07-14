import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';

import { HelpScreen } from '../screens/help-screen';

export default function HelpRoute() {
  useTranslation();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <HelpScreen />
    </>
  );
}
