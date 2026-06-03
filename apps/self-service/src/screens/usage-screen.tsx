import React, { useMemo } from 'react';
import { useApiKeys, useQueryUsage } from '@lightbridge/hooks';
import type { UsageBackendUsageGroupBy, UsageBackendUsageSeriesPoint } from '@lightbridge/api-rest';
import { UsageView } from '../views/usage-view';
import { useRuntimeConfig } from '../configs/runtime-config';

const modelGroupBy: UsageBackendUsageGroupBy[] = ['model'];
const apiKeyGroupBy: UsageBackendUsageGroupBy[] = ['api_key_id'];

/** Default billing cycle start day when not configured. */
const DEFAULT_BILLING_DAY = 6;

/**
 * Compute the start of the current billing period.
 * If today is on or after the billing day, the period started on the billing day of this month.
 * Otherwise, the period started on the billing day of the previous month.
 */
function getBillingPeriodStart(billingDay: number, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (now.getUTCDate() >= billingDay) {
    return new Date(Date.UTC(year, month, billingDay, 0, 0, 0));
  }
  return new Date(Date.UTC(year, month - 1, billingDay, 0, 0, 0));
}

export function UsageScreen() {
  const config = useRuntimeConfig();
  const billingDay = config.usageBillingDay ?? DEFAULT_BILLING_DAY;

  // Time window: billing cycle start → now
  const timeWindow = useMemo(() => {
    const now = new Date();
    const startTime = getBillingPeriodStart(billingDay, now);
    const endTime = now;
    return { startTime, endTime };
  }, [billingDay]);

  // Trend: daily buckets for the trend chart
  const trendParams = useMemo(
    () => ({
      ...timeWindow,
      bucket: '1 day' as const,
      limit: 1000,
    }),
    [timeWindow]
  );

  const daysDifference = useMemo(() => {
    return Math.max(
      1,
      Math.ceil((timeWindow.endTime.getTime() - timeWindow.startTime.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [timeWindow]);

  // Totals: query a single bucket representing the entire range
  const totalsParams = useMemo(
    () => ({
      ...timeWindow,
      bucket: `${daysDifference} days` as const,
    }),
    [timeWindow, daysDifference]
  );

  // Model breakdown: query the entire period as a single bucket to let the backend aggregate
  const modelParams = useMemo(
    () => ({
      ...timeWindow,
      bucket: `${daysDifference} days` as const,
      groupBy: modelGroupBy,
      limit: 1000,
    }),
    [timeWindow, daysDifference]
  );

  const apiKeyParams = useMemo(
    () => ({
      ...timeWindow,
      bucket: `${daysDifference} days` as const,
      groupBy: apiKeyGroupBy,
      limit: 1000,
    }),
    [timeWindow, daysDifference]
  );

  const { data: rawTrendData, isLoading: isTrendLoading } = useQueryUsage(trendParams);
  const { data: rawTotalsData } = useQueryUsage(totalsParams);
  const { data: rawModelData, isLoading: isModelLoading } = useQueryUsage(modelParams);
  const { data: rawApiKeyData, isLoading: isApiKeyUsageLoading } = useQueryUsage(apiKeyParams);
  const { data: apiKeys, isLoading: isApiKeysLoading } = useApiKeys();

  // Fill gaps in trend data to ensure the chart represents the full timeline accurately
  const trendData = useMemo(() => {
    if (!rawTrendData) return rawTrendData;

    const points = rawTrendData.points ?? [];
    const pointMap = new Map(
      points.map((p) => {
        // Just use the YYYY-MM-DD part for stable lookup
        const dateKey = p.bucket_start?.substring(0, 10);
        return [dateKey, p];
      })
    );

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

  // Totals: read directly from the aggregated totals point(s), summing if multiple exist due to bucket alignment
  const totals = useMemo(() => {
    const points = rawTotalsData?.points ?? [];
    let cost = 0;
    let requests = 0;
    let tokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    for (const point of points) {
      tokens += point.total_tokens ?? 0;
      promptTokens += point.prompt_tokens ?? 0;
      completionTokens += point.completion_tokens ?? 0;
      requests += point.requests ?? 0;
      cost += (point.usage_value ?? 0) / 1_000_000;
    }

    return { cost, requests, tokens, promptTokens, completionTokens };
  }, [rawTotalsData]);

  // Model data may span multiple buckets — aggregate by model to merge them
  const modelData = useMemo(() => {
    if (!rawModelData?.points) return rawModelData;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};

    for (const point of rawModelData.points) {
      const key = (point.model ?? 'Unknown').trim().toLowerCase();
      if (!aggregated[key]) {
        aggregated[key] = { ...point, model: point.model?.trim() ?? null };
      } else {
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens =
          (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
        aggregated[key].prompt_tokens =
          (aggregated[key].prompt_tokens ?? 0) + (point.prompt_tokens ?? 0);
        aggregated[key].completion_tokens =
          (aggregated[key].completion_tokens ?? 0) + (point.completion_tokens ?? 0);
        aggregated[key].usage_value =
          (aggregated[key].usage_value ?? 0) + (point.usage_value ?? 0);
      }
    }

    return { ...rawModelData, points: Object.values(aggregated) };
  }, [rawModelData]);

  // API key data may span multiple buckets — aggregate by API key to merge them
  const apiKeyData = useMemo(() => {
    if (!rawApiKeyData?.points) return rawApiKeyData;
    const aggregated: Record<string, UsageBackendUsageSeriesPoint> = {};

    for (const point of rawApiKeyData.points) {
      const key = point.api_key_id ?? 'unknown';
      if (!aggregated[key]) {
        aggregated[key] = { ...point };
      } else {
        aggregated[key].requests = (aggregated[key].requests ?? 0) + (point.requests ?? 0);
        aggregated[key].total_tokens =
          (aggregated[key].total_tokens ?? 0) + (point.total_tokens ?? 0);
        aggregated[key].prompt_tokens =
          (aggregated[key].prompt_tokens ?? 0) + (point.prompt_tokens ?? 0);
        aggregated[key].completion_tokens =
          (aggregated[key].completion_tokens ?? 0) + (point.completion_tokens ?? 0);
        aggregated[key].usage_value =
          (aggregated[key].usage_value ?? 0) + (point.usage_value ?? 0);
      }
    }

    return { ...rawApiKeyData, points: Object.values(aggregated) };
  }, [rawApiKeyData]);

  return (
    <UsageView
      totals={totals}
      trendData={trendData}
      modelData={modelData}
      apiKeyData={apiKeyData}
      apiKeys={apiKeys}
      isTrendLoading={isTrendLoading}
      isModelLoading={isModelLoading}
      isApiKeyLoading={isApiKeyUsageLoading || isApiKeysLoading}
    />
  );
}
