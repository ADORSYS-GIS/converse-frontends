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

  const queryParams = useMemo(() => ({ 
    bucket: "1 day" as const, 
    groupBy: ["model"] as Array<"model">, 
    startTime: startOfPeriod, 
    limit: 1000 
  }), [startOfPeriod]);

  // Combine both trend and model requirements into ONE reliable request
  const { data: rawData, isLoading } = useQueryUsage(queryParams);

  // Deriving Daily Trend Data (Date Aggr)
  const trendData = useMemo(() => {
    if (!rawData?.points) return null;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};

    rawData.points.forEach((point) => {
      const key = point.bucket_start || "Unknown";
      if (!aggregated[key]) {
        aggregated[key] = { ...point, model: undefined };
      } else {
        aggregated[key].total_cost = (aggregated[key].total_cost ?? 0) + (point.total_cost ?? 0);
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens = (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
      }
    });

    const sortedPoints = Object.values(aggregated).sort(
      (a, b) => (a.bucket_start || "").localeCompare(b.bucket_start || "")
    );

    return { ...rawData, points: sortedPoints };
  }, [rawData]);

  // Deriving breakdown Data (Model Aggr)
  const modelData = useMemo(() => {
    if (!rawData?.points) return null;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};
    
    rawData.points.forEach(point => {
      const key = (point.model || "Unknown").trim().toLowerCase();
      if (!aggregated[key]) {
        aggregated[key] = { ...point, model: point.model?.trim() };
      } else {
        aggregated[key].total_cost = (aggregated[key].total_cost ?? 0) + (point.total_cost ?? 0);
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens = (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
      }
    });
    return { ...rawData, points: Object.values(aggregated) };
  }, [rawData]);

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
      isTrendLoading={isLoading}
      isModelLoading={isLoading}
    />
  );
}
