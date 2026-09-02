import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';

import { safeCost } from '../containers/overview-usage';
import type { DerivedMetricName } from './dashboard-spec';

/**
 * The three metrics a panel can name as `metric: derived:<name>` — each a named PURE function of
 * one usage response, each unit-tested (converse-frontends#446, decision D-K).
 *
 * "Derived" means the number is not a column the backend returns; it is arithmetic over columns
 * that are. That makes each one a place a fabricated figure could creep in, which is why they are
 * separate exported functions with their own tests rather than expressions inlined in an adapter:
 *
 *  - **Money is micro-USD on the wire.** Every cost read here goes through `safeCost`
 *    (`overview-usage.ts`), the same guard every other adapter uses — it converts micro-USD to USD
 *    and clamps a malformed/negative `total_cost` to 0 for that point alone rather than throwing
 *    and taking the panel down.
 *  - **`null` means unknown, never 0.** A ratio with no denominator returns `null`, and the panel
 *    renders a dash — never `$0.00 / 1M tokens`, which reads as "we measured it and it is free".
 *  - **A distinct-count is over the response's own group keys**, so it can only ever count actors
 *    that had usage in the window. That is a real, structural limit of a usage-EVENTS query (an
 *    actor with genuinely zero usage never appears as a group at all), and the panels that use
 *    these caption it rather than presenting the count as an estate census.
 */

/** A finite, non-negative token count — the sibling of `safeCost`/`safeRequests` for the token
 *  columns, which are plain integers on the wire (no micro-unit conversion). */
function safeTokens(point: UsageSeriesPoint): number {
  return Number.isFinite(point.total_tokens) && point.total_tokens > 0 ? point.total_tokens : 0;
}

function safeRequests(point: UsageSeriesPoint): number {
  return Number.isFinite(point.requests) && point.requests > 0 ? point.requests : 0;
}

/**
 * Total cost per million tokens across the whole response, in USD (panel 5 of `/admin/usage`).
 *
 * `null` when the response carries no tokens at all — dividing by zero tokens has no honest
 * answer, and "$0.00 per million" would be a fabricated one. Spend with zero tokens is a real
 * state (an embeddings or image call whose token columns are unset), not an error.
 */
export function avgCostPerMillionTokens(response: UsageQueryResponse): number | null {
  let cost = 0;
  let tokens = 0;
  for (const point of response.points) {
    cost += safeCost(point);
    tokens += safeTokens(point);
  }
  if (tokens <= 0) return null;
  return (cost / tokens) * 1_000_000;
}

/**
 * How many DISTINCT actors drew anything in the window (panel 6). The response must be grouped by
 * the dimension being counted — the adapter passes `'user_id'` by default, `'account_id'` or
 * `'project_id'` for the other lenses.
 *
 * A point only counts when it carries real activity (`requests > 0`): a bucket the backend
 * returned with a zero request count is not evidence that the actor was active in it. A point
 * whose group key is null/empty is not counted at all — "usage attributed to nobody" is not one
 * more actor, the same rule `activeProjectsPerDay` states for projects.
 */
export function activeActors(
  response: UsageQueryResponse,
  dimension: keyof UsageSeriesPoint = 'user_id'
): number {
  const seen = new Set<string>();
  for (const point of response.points) {
    if (safeRequests(point) <= 0) continue;
    const value = point[dimension];
    if (typeof value !== 'string' || value.length === 0) continue;
    seen.add(value);
  }
  return seen.size;
}

/**
 * Total requests in the window (panel 14, "Total chat completions count").
 *
 * The FILTERING to chat-shaped operations is the query's job, not this function's — the panel's
 * YAML entry carries `filters: { operation: chat_completions }` (lane A3's column). Summing here
 * and filtering there is what keeps this a pure, testable count instead of a function that has to
 * know the backend's operation vocabulary; before A3 lands, the same panel counts every request
 * and its subtitle says so.
 */
export function chatCount(response: UsageQueryResponse): number {
  return response.points.reduce((sum, point) => sum + safeRequests(point), 0);
}

/**
 * `derived:<name>` → its implementation. The map is exhaustive over `DERIVED_METRICS` by
 * construction (the `satisfies` below fails to compile if a name is added to the spec's list
 * without a function here), which is the compile-time half of the AC's "an unknown `derived:` name
 * is a validation error, never a silent skip"; the runtime half is the schema's own closed enum.
 */
export const derivedMetrics = {
  avgCostPerMillionTokens,
  activeActors,
  chatCount,
} satisfies Record<DerivedMetricName, (response: UsageQueryResponse, ...rest: never[]) => unknown>;
