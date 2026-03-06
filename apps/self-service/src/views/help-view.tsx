import React from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Text } from '@lightbridge/ui';
import { ScreenShell } from './screen-shell';

export function HelpView() {
  const { t } = useTranslation();

  return (
    <ScreenShell title={t('help.title')}>
      <Stack gap="sm" align="center" justify="center" flex="grow">
        <Text intent="eyebrow" align="center">
          {t('help.comingSoon')}
        </Text>
      </Stack>
    </ScreenShell>
  );
}
