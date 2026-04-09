import React from 'react';
import { Card, Stack, Text, Div } from '@lightbridge/ui';
import { useTranslation } from 'react-i18next';
import { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';

interface Props {
  points?: UsageBackendUsageSeriesPoint[];
  isLoading: boolean;
}

export function UsageTrendChart({ points, isLoading }: Props) {
  const { t } = useTranslation();
  
  // Calculate max cost for relative chart bar heights (microUSD values — division
  // is unnecessary for proportional sizing since both max and per-bar scale equally)
  const maxUsage = React.useMemo(() => {
    if (!points || points.length === 0) return 0;
    return Math.max(...points.map(p => p.total_cost ?? 0));
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
        <Text intent="bodyStrong">{t('usage.dailyUsage')}</Text>
        
        {/* Chart Area */}
        <Stack 
          direction="row" 
          align="end" 
          gap={points.length > 30 ? 'none' : 'xs'} 
          style={{ height: 160, width: '100%' }}
        >
          {points.map((point, index) => {
            const val = point.total_cost ?? 0;
            const heightPercent = maxUsage > 0 ? Math.max((val / maxUsage) * 100, 2) : 2;
            
            return (
              <Stack key={index} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Div 
                  tone="brand" 
                  rounded="sm" 
                  style={{ 
                    height: `${heightPercent}%`, 
                    width: '100%', 
                    maxWidth: points.length > 50 ? undefined : 32, 
                    minHeight: 4,
                    // Add a tiny bit of separation even with gap="none" if there's enough space
                    marginHorizontal: points.length > 50 ? 0.5 : 0 
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
