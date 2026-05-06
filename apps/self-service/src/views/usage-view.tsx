import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { designTokens, Heading, Page, Scroll, Stack } from '@lightbridge/ui';
import { UsageKpiCard } from '../components/usage-kpi-card';
import { UsageTrendChart } from '../components/usage-trend-chart';
import { UsageModelBreakdown } from '../components/usage-model-breakdown';
import { UsageApiKeyBreakdown } from '../components/usage-api-key-breakdown';
import type { ApiKeyBackendApiKey, UsageBackendQueryUsageResponse } from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

interface UsageViewProps {
  totals: { cost: number; requests: number; tokens: number };
  trendData?: UsageBackendQueryUsageResponse | null;
  modelData?: UsageBackendQueryUsageResponse | null;
  apiKeyData?: UsageBackendQueryUsageResponse | null;
  apiKeys?: ApiKeyBackendApiKey[];
  isTrendLoading: boolean;
  isModelLoading: boolean;
  isApiKeyLoading: boolean;
}

const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

export function UsageView({
  totals,
  trendData,
  modelData,
  apiKeyData,
  apiKeys,
  isTrendLoading,
  isModelLoading,
  isApiKeyLoading,
}: UsageViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const formatCost = (cost: number) => costFormatter.format(cost);

  return (
    <Page pad="none">
      <Scroll tone="muted" pad="md">
        <Stack gap="lg" style={{ paddingBottom: designTokens.layout.bottomNavClearance }}>
          <Heading tone="title">{t('usage.title')}</Heading>

          {/* Top KPI Cards Layout */}
          <Stack gap="md">
            <UsageKpiCard
              variant="brand"
              label={t('usage.totalCost')}
              value={formatCost(totals.cost)}
              icon={
                <Ionicons name="card" size={designTokens.icon.prominent} color={colors.surface} />
              }
            />
            <Stack direction="row" gap="md" wrap="wrap">
              <UsageKpiCard
                label={t('usage.totalRequests')}
                value={totals.requests.toLocaleString()}
                tone="accentSoft"
                icon={
                  <Ionicons
                    name="swap-horizontal"
                    size={designTokens.icon.action}
                    color={colors.accent}
                  />
                }
              />
              <UsageKpiCard
                label={t('usage.totalTokens')}
                value={totals.tokens.toLocaleString()}
                tone="successSoft"
                icon={
                  <Ionicons name="layers" size={designTokens.icon.action} color={colors.success} />
                }
              />
            </Stack>
          </Stack>

          <UsageTrendChart points={trendData?.points} isLoading={isTrendLoading} />
          <UsageModelBreakdown points={modelData?.points} isLoading={isModelLoading} />
          <UsageApiKeyBreakdown
            apiKeys={apiKeys}
            points={apiKeyData?.points}
            isLoading={isApiKeyLoading}
          />
        </Stack>
      </Scroll>
    </Page>
  );
}
