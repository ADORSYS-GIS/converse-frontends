import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
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

const tokenFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
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

  // Sort by total_tokens (primary metric with real data), fall back to total_cost
  const sortedPoints = React.useMemo(() => {
    if (!points) return [];
    return points
      .slice()
      .sort((a, b) => (b.total_tokens ?? 0) - (a.total_tokens ?? 0))
      .slice(0, 10);
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

  const maxTokens = sortedPoints[0].total_tokens ?? 0;
  const formatCost = (usd: number) => costFormatter.format(usd);

  return (
    <Card size="md">
      <Stack gap="md">
        <Text intent="bodyStrong">{t('usage.costByApiKey')}</Text>
        <Stack gap="sm">
          {sortedPoints.map((point, index) => {
            const tokens = point.total_tokens ?? 0;
            const percentage = maxTokens > 0 ? (tokens / maxTokens) * 100 : 0;
            const cost = (point.usage_value ?? 0) / 1_000_000;
            const requests = point.requests ?? 0;
            const fallbackName = t('usage.unknownApiKey');
            const apiKeyName = point.api_key_id
              ? (apiKeyNameById.get(point.api_key_id) ?? fallbackName)
              : fallbackName;

            return (
              <Stack key={point.api_key_id ?? index} gap="xs">
                <Stack direction="row" justify="between">
                  <Text intent="body" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1 }}>
                    {apiKeyName}
                  </Text>
                  <Text intent="bodyStrong">{tokenFormatter.format(tokens)}</Text>
                </Stack>
                <Div
                  pad="none"
                  tone="surface"
                  rounded="full"
                  width="full"
                  style={{ height: 12, overflow: 'hidden' }}
                >
                  <Div
                    pad="none"
                    tone="accent"
                    rounded="full"
                    style={{ height: '100%', width: `${Math.max(percentage, 2)}%` }}
                  />
                </Div>
                <Stack direction="row" justify="between">
                  <Text intent="caption">
                    {t('usage.requestsShort')}: {requests.toLocaleString()}
                  </Text>
                  {cost > 0 && (
                    <Text intent="caption">{formatCost(cost)}</Text>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
