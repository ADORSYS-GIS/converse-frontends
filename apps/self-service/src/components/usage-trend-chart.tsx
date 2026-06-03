import React from 'react';
import { Card, Stack, Text, Div } from '@lightbridge/ui';
import { useTranslation } from '@lightbridge/i18n';
import type { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';

interface Props {
  points?: UsageBackendUsageSeriesPoint[];
  isLoading: boolean;
}

const tokenFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function UsageTrendChart({ points, isLoading }: Props) {
  const { t } = useTranslation();

  // Use total_tokens for chart bars — total_cost is often 0 in the data
  const maxTokens = React.useMemo(() => {
    if (!points || points.length === 0) return 0;
    return Math.max(...points.map((p) => p.total_tokens ?? 0));
  }, [points]);

  if (isLoading) {
    return (
      <Card size="md">
        <Stack gap="md">
          <Text intent="bodyStrong">{t('usage.dailyUsage')}</Text>
          <Text intent="caption">{t('usage.loading')}</Text>
        </Stack>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card size="md">
        <Stack gap="sm" align="center" justify="center">
          <Text intent="bodyStrong">{t('usage.dailyUsage')}</Text>
          <Text intent="caption">{t('usage.noData')}</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card size="md">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center">
          <Text intent="bodyStrong">{t('usage.dailyUsage')}</Text>
          <Text intent="caption">{t('usage.tokenTrendLabel')}</Text>
        </Stack>

        {/* Chart Area */}
        <Stack
          direction="row"
          align="end"
          gap={points.length > 30 ? 'none' : 'xs'}
          style={{ height: 160, width: '100%' }}
        >
          {points.map((point, index) => {
            const val = point.total_tokens ?? 0;
            const heightPercent = maxTokens > 0 ? Math.max((val / maxTokens) * 100, 2) : 2;

            return (
              <Stack
                key={index}
                style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <Div
                  tone="brand"
                  rounded="sm"
                  style={{
                    height: `${heightPercent}%`,
                    width: '100%',
                    maxWidth: points.length > 50 ? undefined : 32,
                    minHeight: 4,
                    marginHorizontal: points.length > 50 ? 0.5 : 0,
                  }}
                />
              </Stack>
            );
          })}
        </Stack>

        <Stack direction="row" justify="between">
          <Text intent="caption">{points[0]?.bucket_start?.substring(5, 10) ?? ''}</Text>
          {points.length > 40 && (
            <Text intent="caption">
              {points[Math.floor(points.length / 2)]?.bucket_start?.substring(5, 10) ?? ''}
            </Text>
          )}
          <Text intent="caption">{points[points.length - 1]?.bucket_start?.substring(5, 10) ?? ''}</Text>
        </Stack>
      </Stack>
    </Card>
  );
}
