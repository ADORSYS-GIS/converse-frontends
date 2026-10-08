import type {
  ExecutionQueryResponse,
  ExecutionSeriesPoint,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';

/**
 * The execution grain (lightbridge-authz#726), read through the SAME adapters as the event grain
 * (lightbridge-governance#36).
 *
 * IDE agents — Claude Code, Codex, … — report native telemetry that the usage store keeps as
 * EXECUTIONS (`usage_executions` + child model/tool calls), not as gateway `usage_events`. The two
 * have different wire shapes, but every question a dashboard panel asks of either — cost, tokens,
 * a count, per bucket, per dimension — is the same question. So the execution response is mapped
 * onto `UsageSeriesPoint` once, here, at the fetch boundary, and nothing downstream (adapters,
 * panel types, the report export) needs to know which grain a panel reads.
 *
 * React-free and DOM-free like `resolve-dashboard.ts`: the server-side report path calls it too.
 */

/** Which backend grain a panel reads. `events` is every panel that existed before this module. */
export const DASHBOARD_GRAINS = ['events', 'executions'] as const;
export type DashboardGrain = (typeof DASHBOARD_GRAINS)[number];

/**
 * The `group_by` dimensions and filter keys a panel may use on the execution grain. A subset of
 * the backend's `ExecutionGroupBy`: `provider` is deliberately absent, because `UsageSeriesPoint`
 * has no field to carry its echo — a panel grouped by it would read every row as null and draw
 * one "Unassigned" bar. Add the field before adding the dimension. Anything outside this list is
 * refused at parse, one hop before the backend's own 400.
 */
export const EXECUTION_DIMENSIONS: readonly string[] = ['source', 'model'];

/** The scopes the execution grain accepts: `user` (self) and `all` (`usage:read-all`). The
 *  backend has no per-account/per-project ownership authority for this grain and 400s the rest. */
export const EXECUTION_SCOPES: readonly string[] = ['user', 'all'];

/**
 * One execution bucket as a usage point.
 *
 * - `requests` ← `executions_count`. On an execution panel a "request" is one agent session —
 *   the panel's title is what names it; the number is the honest count of what was stored.
 * - `total_cost` keeps its null: integer micro-USD when known, `null` when no execution in the
 *   bucket carried a cost. Never coerced to 0 — unknown is not free (lightbridge-governance#188).
 * - Latency is absent (`latency_samples: 0`, percentiles null): the grain does not compute
 *   percentiles yet, and an absent measurement is not a 0 ms one.
 */
export function executionPointToUsagePoint(point: ExecutionSeriesPoint): UsageSeriesPoint {
  return {
    bucket_start: point.bucket_start,
    source: point.source ?? null,
    model: point.model ?? null,
    requests: point.executions_count,
    usage_value: point.executions_count,
    total_cost: point.total_cost ?? null,
    prompt_tokens: point.total_input_tokens,
    completion_tokens: point.total_output_tokens,
    total_tokens: point.total_input_tokens + point.total_output_tokens,
    latency_samples: 0,
    latency_p50_ms: null,
    latency_p95_ms: null,
    latency_p99_ms: null,
  };
}

export function executionResponseToUsageResponse(
  response: ExecutionQueryResponse
): UsageQueryResponse {
  return {
    truncated: response.truncated,
    points: response.points.map(executionPointToUsagePoint),
  };
}
