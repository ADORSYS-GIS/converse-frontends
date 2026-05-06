import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiKeyBackendApiKey, UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { Card, Div, Stack, Text } from '@lightbridge/ui';

type UsageApiKeyBreakdownProps = {
  apiKeys?: ApiKeyBackendApiKey[];
  points?: UsageBackendUsageSeriesPoint[];
  isLoading: boolean;
};

const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

export function UsageApiKeyBreakdown({
  apiKeys,
  points,
  isLoading,
}: Readonly<UsageApiKeyBreakdownProps>) {
  const { t } = useTranslation();

  const apiKeyNameById = React.useMemo(() => {
    return new Map((apiKeys ?? []).map((apiKey) => [apiKey.id, apiKey.name]));
  }, [apiKeys]);

  const sortedPoints = React.useMemo(() => {
    if (!points) return [];
    return points
      .slice()
      .sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0))
      .slice(0, 8);
  }, [points]);

  if (isLoading) {
    return (
      <Card size="md">
        <Stack gap="md">
          <Text intent="bodyStrong">{t('usage.costByApiKey')}</Text>
          <Text intent="caption">{t('usage.loading')}</Text>
        </Stack>
      </Card>
    );
  }

  if (sortedPoints.length === 0) {
    return (
      <Card size="md">
        <Stack gap="sm" align="center" justify="center">
          <Text intent="bodyStrong">{t('usage.costByApiKey')}</Text>
          <Text intent="caption">{t('usage.noData')}</Text>
        </Stack>
      </Card>
    );
  }

  const maxCost = sortedPoints[0].total_cost ?? 0;
  const formatCost = (microUsd: number) => costFormatter.format(microUsd / 1_000_000);

  return (
    <Card size="md">
      <Stack gap="md">
        <Text intent="bodyStrong">{t('usage.costByApiKey')}</Text>
        <Stack gap="sm">
          {sortedPoints.map((point, index) => {
            const cost = point.total_cost ?? 0;
            const percentage = maxCost > 0 ? (cost / maxCost) * 100 : 0;
            const fallbackName = t('usage.unknownApiKey');
            const apiKeyName = point.api_key_id
              ? (apiKeyNameById.get(point.api_key_id) ?? fallbackName)
              : fallbackName;

            return (
              <Stack key={point.api_key_id ?? index} gap="xs">
                <Stack direction="row" justify="between">
                  <Text intent="body" numberOfLines={1} ellipsizeMode="tail">
                    {apiKeyName}
                  </Text>
                  <Text intent="bodyStrong">{formatCost(cost)}</Text>
                </Stack>
                <Div
                  pad="none"
                  tone="surface"
                  rounded="full"
                  width="full"
                  style={{ height: 16, overflow: 'hidden' }}>
                  <Div
                    pad="none"
                    tone="accent"
                    rounded="full"
                    style={{ height: '100%', width: `${Math.max(percentage, 2)}%` }}
                  />
                </Div>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
