import React from 'react';
import { useRouter } from 'expo-router';
import { openExternalUrl } from '@lightbridge/api-native';

import { HelpView } from '../views/help-view';

export function HelpScreen() {
  const router = useRouter();

  return (
    <HelpView
      onBack={() => router.back()}
      onOpenDocs={() => void openExternalUrl('https://docs.example.com/api')}
      onOpenKeysGuide={() => void openExternalUrl('https://docs.example.com/guides/api-keys')}
      onContactSupport={() => void openExternalUrl('mailto:support@example.com')}
    />
  );
}
