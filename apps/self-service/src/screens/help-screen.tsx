import React from 'react';
import { openExternalUrl } from '@lightbridge/api-native';

import { HelpView } from '../views/help-view';

export function HelpScreen() {
  return (
    <HelpView
      onOpenDocs={() => void openExternalUrl('https://docs.example.com/api')}
      onOpenKeysGuide={() => void openExternalUrl('https://docs.example.com/guides/api-keys')}
      onContactSupport={() => void openExternalUrl('mailto:support@example.com')}
    />
  );
}
