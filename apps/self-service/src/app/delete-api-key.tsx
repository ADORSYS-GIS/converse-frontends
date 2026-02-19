import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeleteApiKeyModal } from '../screens/delete-api-key-modal';

export default function DeleteApiKeyRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('deleteKey.title'),
        }}
      />
      <DeleteApiKeyModal />
    </>
  );
}
