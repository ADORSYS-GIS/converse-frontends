import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Scroll, Stack } from '@lightbridge/ui';
import { ScreenShell } from './screen-shell';
import { UsageKpiCard } from '../components/usage-kpi-card';
import { UsageTrendChart } from '../components/usage-trend-chart';
import { UsageModelBreakdown } from '../components/usage-model-breakdown';
import type { UsageBackendQueryUsageResponse } from '@lightbridge/api-rest';
import { useThemeColors } from '../hooks/use-theme-colors';

interface UsageViewProps {
  totals: { cost: number; requests: number; tokens: number };
  trendData?: UsageBackendQueryUsageResponse | null;
  modelData?: UsageBackendQueryUsageResponse | null;
  isTrendLoading: boolean;
  isModelLoading: boolean;
}

const iconSize = 20;

export function UsageView({ totals, trendData, modelData, isTrendLoading, isModelLoading }: UsageViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(cost);
  };

  return (
    <ScreenShell title={t('usage.title')}>
      <Scroll>
        <Stack gap="lg" style={{ paddingBottom: 100 }}>
          {/* Top KPI Cards Layout */}
          <Stack gap="sm">
            <UsageKpiCard 
              variant="brand"
              label={t('usage.totalCost')} 
              value={formatCost(totals.cost)} 
              icon={<Ionicons name="card" size={iconSize} color={colors.surface} />}
            />
            <Stack direction="row" gap="sm" wrap="wrap">
              <UsageKpiCard 
                label={t('usage.totalRequests')} 
                value={totals.requests.toLocaleString()} 
                icon={<Ionicons name="swap-horizontal" size={iconSize} color={colors.accent} />}
              />
              <UsageKpiCard 
                label={t('usage.totalTokens')} 
                value={totals.tokens.toLocaleString()} 
                icon={<Ionicons name="layers" size={iconSize} color={colors.success} />}
              />
            </Stack>
          </Stack>
          
          <UsageTrendChart points={trendData?.points} isLoading={isTrendLoading} />
          <UsageModelBreakdown points={modelData?.points} isLoading={isModelLoading} />
        </Stack>
      </Scroll>
    </ScreenShell>
  );
}
