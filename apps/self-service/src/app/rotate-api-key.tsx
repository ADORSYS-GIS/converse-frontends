import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';

import { RotateApiKeyModal } from '../screens/rotate-api-key-modal';

export default function RotateApiKeyRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('apiKeys.rotateTitle'),
        }}
      />
      <RotateApiKeyModal />
    </>
  );
}
