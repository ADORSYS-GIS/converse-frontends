import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from '@lightbridge/i18n';

import { DeleteAccountModal } from '../screens/delete-account-modal';

export default function DeleteAccountRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('deleteAccount.title'),
        }}
      />
      <DeleteAccountModal />
    </>
  );
}
