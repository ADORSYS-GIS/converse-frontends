import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  designTokens,
  Div,
  Heading,
  Page,
  Scroll,
  SegmentedControl,
  Stack,
  Text,
} from '@lightbridge/ui';
import { UsageKpiCard } from '../components/usage-kpi-card';
import { UsageTrendChart } from '../components/usage-trend-chart';
import { UsageModelBreakdown } from '../components/usage-model-breakdown';
import { UsageApiKeyBreakdown } from '../components/usage-api-key-breakdown';
import type {
  ApiKeyBackendApiKey,
  UsageBackendQueryUsageResponse,
  UsageBackendUsageScope,
} from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

interface UsageViewProps {
  scope: UsageBackendUsageScope;
  onScopeChange: (scope: UsageBackendUsageScope) => void;
  scopeApiKeyId?: string | null;
  onScopeApiKeyChange?: (id: string) => void;
  totals: {
    cost: number;
    requests: number;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
  };
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

export const formatCost = (cost: number) => costFormatter.format(cost);

export function UsageView({
  scope,
  onScopeChange,
  scopeApiKeyId,
  onScopeApiKeyChange,
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

  const scopeOptions = [
    { key: 'account', label: t('usage.scope.account') },
    { key: 'project', label: t('usage.scope.project') },
    { key: 'api_key', label: t('usage.scope.apiKey') },
    { key: 'user', label: t('usage.scope.user') },
  ];

  const isApiKeyScopeUnresolved = scope === 'api_key' && !scopeApiKeyId;

  return (
    <Page pad="none">
      <Scroll tone="muted" pad="md">
        <Stack gap="lg" style={{ paddingBottom: designTokens.layout.bottomNavClearance }}>
          <Heading tone="title">{t('usage.title')}</Heading>

          <SegmentedControl
            width="full"
            options={scopeOptions}
            value={scope}
            onChange={(key) => onScopeChange(key as UsageBackendUsageScope)}
          />

          {scope === 'api_key' ? (
            <Card size="sm">
              <Stack gap="xs">
                <Text intent="bodyStrong">{t('usage.scope.selectApiKeyLabel')}</Text>
                {apiKeys && apiKeys.length > 0 ? (
                  <Stack direction="row" wrap="wrap" gap="sm">
                    {apiKeys.map((key) => {
                      const isSelected = key.id === scopeApiKeyId;

                      return (
                        <Button
                          key={key.id}
                          variant={isSelected ? 'primary' : 'neutral'}
                          size="sm"
                          onPress={() => onScopeApiKeyChange?.(key.id)}
                          accessibilityLabel={t('usage.scope.selectApiKeyNamed', {
                            name: key.name,
                          })}>
                          {key.name}
                        </Button>
                      );
                    })}
                  </Stack>
                ) : (
                  <Text intent="caption">{t('usage.scope.noApiKeys')}</Text>
                )}
              </Stack>
            </Card>
          ) : null}

          {isApiKeyScopeUnresolved ? (
            <Div tone="muted" rounded="xl" pad="md" width="full">
              <Text intent="caption">{t('usage.scope.selectApiKeyPrompt')}</Text>
            </Div>
          ) : (
            <>
              {/* Top KPI Cards Layout */}
              <Stack gap="md">
                <UsageKpiCard
                  variant="brand"
                  label={t('usage.totalCost')}
                  value={formatCost(totals.cost)}
                  tone="successSoft"
                  icon={
                    <Ionicons
                      name="card"
                      size={designTokens.icon.prominent}
                      color={colors.success}
                    />
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
                    tone="muted"
                    icon={
                      <Ionicons
                        name="layers"
                        size={designTokens.icon.prominent}
                        color={colors.primary}
                      />
                    }
                  />
                </Stack>
                <Stack direction="row" gap="md" wrap="wrap">
                  <UsageKpiCard
                    label={t('usage.promptTokens')}
                    value={totals.promptTokens.toLocaleString()}
                    tone="muted"
                    icon={
                      <Ionicons
                        name="arrow-up"
                        size={designTokens.icon.action}
                        color={colors.success}
                      />
                    }
                  />
                  <UsageKpiCard
                    label={t('usage.completionTokens')}
                    value={totals.completionTokens.toLocaleString()}
                    tone="muted"
                    icon={
                      <Ionicons
                        name="arrow-down"
                        size={designTokens.icon.action}
                        color={colors.success}
                      />
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
            </>
          )}
        </Stack>
      </Scroll>
    </Page>
  );
}
