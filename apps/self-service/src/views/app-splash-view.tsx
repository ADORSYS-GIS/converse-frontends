import React from 'react';
import { useTranslation } from 'react-i18next';

import { Heading, Page, Stack } from '@lightbridge/ui';

export function AppSplashView() {
  const { t } = useTranslation();

  return (
    <Page tone="muted" pad="lg">
      <Stack align="center" justify="center" flex="grow" width="full">
        <Stack align="center" gap="lg" width="full">
          <Stack align="center" gap="xs" width="full">
            <Heading tone="title" align="center">
              {t('app.brand')}
            </Heading>
            <Heading tone="subtitle" align="center">
              {t('app.splash.loading')}
            </Heading>
          </Stack>
        </Stack>
      </Stack>
    </Page>
  );
}
