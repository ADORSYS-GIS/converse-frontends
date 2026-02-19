import React from 'react';
import { useTranslation } from 'react-i18next';

import { Page, Stack, Text } from '@lightbridge/ui';

export function HelpView() {
  const { t } = useTranslation();

  return (
    <Page tone="muted">
      <Stack gap="md">
        <Text intent="bodyStrong">{t('help.heading')}</Text>
        <Text intent="body">{t('help.description')}</Text>
        <Text intent="body">{t('help.contact')}</Text>
      </Stack>
    </Page>
  );
}
