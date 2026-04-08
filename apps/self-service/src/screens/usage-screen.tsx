import React, { useMemo } from 'react';
import { useQueryUsage } from '@lightbridge/hooks';
import { UsageView } from '../views/usage-view';

export function UsageScreen() {
  // Fixed time window: April 1 2026 → midnight after today
  const timeWindow = useMemo(() => {
    const startTime = new Date('2026-04-01T00:00:00Z');
    const now = new Date();
    const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return { startTime, endTime };
  }, []);

  // Totals: single aggregated point (no groupBy) for reliable KPI cards
  const totalsParams = useMemo(() => ({
    ...timeWindow,
    bucket: '30 days' as const,
    limit: 1,
  }), [timeWindow]);

  // Trend: daily buckets for the chart
  const trendParams = useMemo(() => ({
    ...timeWindow,
    bucket: '1 day' as const,
    limit: 35,
  }), [timeWindow]);

  // Model breakdown: grouped by model
  const modelParams = useMemo(() => ({
    ...timeWindow,
    bucket: '30 days' as const,
    groupBy: ['model'] as Array<'model'>,
    limit: 50,
  }), [timeWindow]);

  const { data: totalsData, isLoading: isTotalsLoading } = useQueryUsage(totalsParams);
  const { data: trendData, isLoading: isTrendLoading } = useQueryUsage(trendParams);
  const { data: modelData, isLoading: isModelLoading } = useQueryUsage(modelParams);

  // Totals come from the dedicated totals query — one aggregated point
  // total_cost is in microUSD, divide by 1M to get USD
  const totals = useMemo(() => {
    const point = totalsData?.points?.[0];
    if (!point) return { cost: 0, requests: 0, tokens: 0 };
    return {
      cost: (point.total_cost ?? 0) / 1_000_000,
      requests: point.requests ?? 0,
      tokens: point.total_tokens ?? 0,
    };
  }, [totalsData]);

  return (
    <UsageView 
      totals={totals}
      trendData={trendData}
      modelData={modelData}
      isTrendLoading={isTrendLoading || isTotalsLoading}
      isModelLoading={isModelLoading}
    />
  );
}
