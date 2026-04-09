import React, { useMemo } from 'react';
import { useQueryUsage } from '@lightbridge/hooks';
import type { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { UsageView } from '../views/usage-view';

export function UsageScreen() {
  // Time window: March 31 2026 → end of current month
  const timeWindow = useMemo(() => {
    const startTime = new Date('2026-03-31T00:00:00Z');
    const now = new Date();
    // next month, day 1 is the start of next month (effectively end of current month)
    const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { startTime, endTime };
  }, []);

  // Trend: daily buckets — also used to compute totals
  const trendParams = useMemo(() => ({
    ...timeWindow,
    bucket: '1 day' as const,
    limit: 1000,
  }), [timeWindow]);

  // Model breakdown: daily buckets grouped by model, aggregated client-side
  const modelParams = useMemo(() => ({
    ...timeWindow,
    bucket: '1 day' as const,
    groupBy: ['model'] as Array<'model'>,
    limit: 1000,
  }), [timeWindow]);

  const { data: rawTrendData, isLoading: isTrendLoading } = useQueryUsage(trendParams);
  const { data: rawModelData, isLoading: isModelLoading } = useQueryUsage(modelParams);

  // Fill gaps in trend data to ensure the chart represents the full timeline accurately
  const trendData = useMemo(() => {
    if (!rawTrendData) return rawTrendData;
    
    const points = rawTrendData.points ?? [];
    const pointMap = new Map(points.map(p => {
      // Just use the YYYY-MM-DD part for stable lookup
      const dateKey = p.bucket_start?.substring(0, 10);
      return [dateKey, p];
    }));

    const fullPoints: UsageBackendUsageSeriesPoint[] = [];
    const current = new Date(timeWindow.startTime);
    const end = new Date(timeWindow.endTime);

    while (current < end) {
      const dateKey = current.toISOString().substring(0, 10);
      const existing = pointMap.get(dateKey);
      
      if (existing) {
        fullPoints.push(existing);
      } else {
        fullPoints.push({
          bucket_start: current.toISOString(),
          total_cost: 0,
          requests: 0,
          total_tokens: 0,
          usage_value: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          account_id: null,
          project_id: null,
          user_id: null,
          model: null,
          metric_name: null,
          signal_type: null,
        });
      }
      
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return { ...rawTrendData, points: fullPoints };
  }, [rawTrendData, timeWindow]);

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
