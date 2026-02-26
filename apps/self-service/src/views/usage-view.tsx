import React from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Stack, Text } from '@lightbridge/ui';
import { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { ScreenShell } from './screen-shell';

export function UsageView({ usage }: { usage: UsageBackendUsageSeriesPoint[] }) {
  const { t } = useTranslation();

  return (
    <ScreenShell title={t('usage.title')}>
      <Stack gap="sm">
        {usage.map((item) => (
          <Card key={item.bucket_start} size="sm">
            <Stack gap="sm">
              <Text intent="key">
                {new Date(item.bucket_start).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text intent="value">
                {t('usage.tokens', {
                  count: item.total_tokens,
                  formatted: item.total_tokens.toLocaleString(),
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
