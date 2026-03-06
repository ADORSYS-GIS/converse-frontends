import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HelpScreen } from '../screens/help-screen';

export default function HelpRoute() {
  useTranslation();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <HelpScreen />
    </>
  );
}
