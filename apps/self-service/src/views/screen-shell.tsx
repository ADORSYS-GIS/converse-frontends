import React from 'react';
import { useTranslation } from 'react-i18next';

import { Heading, Page, Stack, Text } from '@lightbridge/ui';

export function ScreenShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Page>
      <Heading tone="title">{title}</Heading>
      <Stack gap="md" top="lg" flex="grow">
        {children}
      </Stack>
    </Page>
  );
}
