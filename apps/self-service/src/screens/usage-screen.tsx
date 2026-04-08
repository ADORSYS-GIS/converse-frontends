import React, { useMemo } from 'react';
import { useQueryUsage } from '@lightbridge/hooks';
import type { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { UsageView } from '../views/usage-view';

export function UsageScreen() {
  // Time window: February 1 2026 → midnight after today
  const timeWindow = useMemo(() => {
    const startTime = new Date('2026-02-01T00:00:00Z');
    const now = new Date();
    const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return { startTime, endTime };
  }, []);

  // Trend: daily buckets — also used to compute totals
  const trendParams = useMemo(() => ({
    ...timeWindow,
    bucket: '1 day' as const,
    limit: 100,
  }), [timeWindow]);

  // Model breakdown: 30-day bucket grouped by model
  const modelParams = useMemo(() => ({
    ...timeWindow,
    bucket: '30 days' as const,
    groupBy: ['model'] as Array<'model'>,
    limit: 50,
  }), [timeWindow]);

  const { data: trendData, isLoading: isTrendLoading } = useQueryUsage(trendParams);
  const { data: rawModelData, isLoading: isModelLoading } = useQueryUsage(modelParams);

  // Totals: sum all daily trend points (microUSD → USD for cost)
  const totals = useMemo(() => {
    let cost = 0;
    let requests = 0;
    let tokens = 0;
    if (trendData?.points) {
      for (const point of trendData.points) {
        cost += point.total_cost ?? 0;
        requests += point.requests ?? 0;
        tokens += point.total_tokens ?? 0;
      }
    }
    return { cost: cost / 1_000_000, requests, tokens };
  }, [trendData]);

  // Model data may span multiple 30-day buckets — aggregate by model
  const modelData = useMemo(() => {
    if (!rawModelData?.points) return rawModelData;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};

    for (const point of rawModelData.points) {
      const key = (point.model ?? 'Unknown').trim().toLowerCase();
      if (!aggregated[key]) {
        aggregated[key] = { ...point, model: point.model?.trim() };
      } else {
        aggregated[key].total_cost = (aggregated[key].total_cost ?? 0) + (point.total_cost ?? 0);
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens = (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
      }
    }

    return { ...rawModelData, points: Object.values(aggregated) };
  }, [rawModelData]);

  return (
    <UsageView 
      totals={totals}
      trendData={trendData}
      modelData={modelData}
      isTrendLoading={isTrendLoading}
      isModelLoading={isModelLoading}
    />
  );
}
