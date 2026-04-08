import React, { useMemo, useState } from 'react';
import { useQueryUsage } from '@lightbridge/hooks';
import type { UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { UsageView } from '../views/usage-view';

const getUtcDayStamp = (value: Date) =>
  value.getUTCFullYear() * 10_000 + (value.getUTCMonth() + 1) * 100 + value.getUTCDate();

export function UsageScreen() {
  const [dayStamp] = useState(() => getUtcDayStamp(new Date()));

  const startOfPeriod = useMemo(() => {
    const year = Math.floor(dayStamp / 10_000);
    const month = Math.floor((dayStamp % 10_000) / 100); // 1-12
    const day = dayStamp % 100;
    // exactly 30 days ago at midnight UTC
    return new Date(Date.UTC(year, month - 1, day - 29, 0, 0, 0, 0));
  }, [dayStamp]);

  const trendParams = useMemo(() => ({ bucket: "1 day" as const, startTime: startOfPeriod, limit: 35 }), [startOfPeriod]);
  const modelParams = useMemo(() => ({ bucket: "30 days" as const, groupBy: ["model"] as Array<"model">, startTime: startOfPeriod, limit: 50 }), [startOfPeriod]);

  const { data: trendData, isLoading: isTrendLoading } = useQueryUsage(trendParams);
  const { data: rawModelData, isLoading: isModelLoading } = useQueryUsage(modelParams);

  // Aggregate duplicates if there are multiple buckets returned for the same model
  const modelData = useMemo(() => {
    if (!rawModelData?.points) return rawModelData;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};
    
    rawModelData.points.forEach(point => {
      const key = (point.model || "Unknown").trim().toLowerCase();
      if (!aggregated[key]) {
        aggregated[key] = { ...point, model: point.model?.trim() };
      } else {
        aggregated[key].total_cost = (aggregated[key].total_cost ?? 0) + (point.total_cost ?? 0);
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens = (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
      }
    });
    return { ...rawModelData, points: Object.values(aggregated) };
  }, [rawModelData]);

  const totals = useMemo(() => {
    let cost = 0;
    let requests = 0;
    let tokens = 0;
    if (modelData?.points) {
      modelData.points.forEach(point => {
        // total_cost is delivered as microUSD from the backend
        cost += point.total_cost ? point.total_cost / 1_000_000 : 0;
        requests += point.requests ?? 0;
        tokens += point.total_tokens ?? 0;
      });
    }
    return { cost, requests, tokens };
  }, [modelData]);

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
