import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HelpScreen } from '../screens/help-screen';

export default function HelpRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('help.title') }} />
      <HelpScreen />
    </>
  );
}
