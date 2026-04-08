import React from 'react';
import { Card, Stack, Text, Div } from '@lightbridge/ui';
import { useTranslation } from 'react-i18next';
import { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';

interface Props {
  points?: UsageBackendUsageSeriesPoint[];
  isLoading: boolean;
}

export function UsageModelBreakdown({ points, isLoading }: Props) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <Card size="md">
        <Stack gap="md">
          <Text intent="bodyStrong">{t('usage.costByModel')}</Text>
          <Text intent="caption">{t('usage.loading')}</Text>
        </Stack>
      </Card>
    );
  }

  if (!points || points.length === 0) {
    return (
      <Card size="md">
        <Stack gap="sm" align="center" justify="center">
          <Text intent="bodyStrong">{t('usage.costByModel')}</Text>
          <Text intent="caption">{t('usage.noData')}</Text>
        </Stack>
      </Card>
    );
  }

  // Find max cost for proportional bar widths (raw microUSD values)
  const maxCost = Math.max(...points.map(p => p.total_cost ?? 0));

  // Convert microUSD → USD for display only
  const formatCost = (microUsd: number) => {
    const usd = microUsd / 1_000_000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(usd);
  };

  return (
    <Card size="md">
      <Stack gap="md">
        <Text intent="bodyStrong">{t('usage.costByModel')}</Text>
        <Stack gap="sm">
          {/* using slice to avoid mutating the original array */}
          {points.slice().sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0)).slice(0, 8).map((point, index) => {
            const cost = point.total_cost ?? 0;
            const percentage = maxCost > 0 ? (cost / maxCost) * 100 : 0;
            return (
              <Stack key={point.model ?? index} gap="xs">
                <Stack direction="row" justify="between">
                  <Text intent="body">{point.model ?? 'Unknown'}</Text>
                  <Text intent="bodyStrong">{formatCost(cost)}</Text>
                </Stack>
                <Div pad="none" tone="surface" rounded="full" width="full" style={{ height: 16, overflow: 'hidden' }}>
                  <Div pad="none" tone="brand" rounded="full" style={{ height: '100%', width: `${Math.max(percentage, 2)}%` }} />
                </Div>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
