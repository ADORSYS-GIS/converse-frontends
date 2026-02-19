import React from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Stack, Text } from '@lightbridge/ui';
import { ScreenShell } from './screen-shell';
import type { TokenUsage } from '@lightbridge/api-rest';

export function UsageView({ usage }: { usage: TokenUsage[] }) {
  const { t } = useTranslation();

  return (
    <ScreenShell title={t('usage.title')}>
      <Stack gap="sm">
        {usage.map((item) => (
          <Card key={item.date} size="sm">
            <Stack gap="sm">
              <Text intent="key">{item.date}</Text>
              <Text intent="value">
                {t('usage.tokens', {
                  count: item.tokens,
                  formatted: item.tokens.toLocaleString(),
                })}
              </Text>
              <Text intent="caption">
                {t('usage.requests', {
                  count: item.requests,
                  formatted: item.requests.toLocaleString(),
                })}
              </Text>
            </Stack>
          </Card>
        ))}
      </Stack>
    </ScreenShell>
  );
}
