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
 * How many DISTINCT actors of one dimension drew anything, BROKEN DOWN by a second dimension —
 * `/admin/usage`'s "accounts with usage per billing plan" (owner Q4, confirmed), and what a
 * `stat-group` panel with `metric: derived:activeActors` and `group_by: [account_id, billing_plan]`
 * renders as one card per plan.
 *
 * It is a genuinely different question from `activeActors` above, not a convenience wrapper:
 * summing per-plan account counts does NOT give the estate's account count, because one account
 * can appear under two plans across a window (a plan change mid-month is a real event). Each card
 * therefore states its own honest count and the panel does not print a total.
 *
 * The same two rules apply as everywhere else here: a point with `requests <= 0` is not evidence of
 * activity, and a null/empty key on EITHER dimension is skipped rather than folded into an
 * "Unassigned" card — "an account on no plan we can name" is not a plan, and inventing a bucket for
 * it would put a number under a label nobody can act on.
 */
export function activeActorsByGroup(
  response: UsageQueryResponse,
  countDimension: string,
  groupDimension: string
): { key: string; count: number }[] {
  const perGroup = new Map<string, Set<string>>();
  for (const point of response.points) {
    if (safeRequests(point) <= 0) continue;
    const row = point as unknown as Record<string, unknown>;
    const actor = row[countDimension];
    const group = row[groupDimension];
    if (typeof actor !== 'string' || actor.length === 0) continue;
    if (typeof group !== 'string' || group.length === 0) continue;
    const seen = perGroup.get(group) ?? new Set<string>();
    seen.add(actor);
    perGroup.set(group, seen);
  }
  return Array.from(perGroup.entries())
    .map(([key, seen]) => ({ key, count: seen.size }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * The most recent bucket in which each group key actually drew something — the actor table's
 * "Last active" column (converse-frontends#448).
 *
 * BUCKET-grained, and that is the honest reading, not an approximation to apologise for: the usage
 * API returns buckets, not events, so the finest "when" it can answer is "in the bucket starting
 * at T". A group with no bucket carrying `requests > 0` is ABSENT from the result rather than
 * dated at the window start — the console renders a dash for it, because "we have rows for this
 * actor but none with activity" is not a date.
 */
export function lastActiveByGroup(
  response: UsageQueryResponse,
  dimension: string
): Map<string, Date> {
  const latest = new Map<string, number>();
  for (const point of response.points) {
    if (safeRequests(point) <= 0) continue;
    const value = (point as unknown as Record<string, unknown>)[dimension];
    if (typeof value !== 'string' || value.length === 0) continue;
    const t = new Date(point.bucket_start).getTime();
    if (!Number.isFinite(t)) continue;
    latest.set(value, Math.max(latest.get(value) ?? Number.NEGATIVE_INFINITY, t));
  }
  return new Map(Array.from(latest.entries()).map(([key, t]) => [key, new Date(t)]));
}

/**
 * How many DISTINCT actors drew anything in EACH bucket, one count series per group-by dimension
 * — the series counterpart of `activeActors` above, and what `/admin/overview`'s adoption board
 * plots ("Active accounts & projects per day").
 *
 * A `series` panel normally plots a value PER GROUP (one line per model). This one is the
 * opposite: the group keys are what is being counted, so `group_by: [account_id, project_id]`
 * yields exactly two lines — "how many distinct accounts" and "how many distinct projects" — not
 * one line per account. That is why it is a named derived metric rather than a `metric: requests`
 * panel with different options: no reading of a point's own columns produces it.
 *
 * The same two honesty rules the scalar version states apply per bucket: a point with
 * `requests <= 0` is not evidence of activity, and a null/empty group key is not one more actor.
 * A bucket in which a dimension saw nothing yields `0` rather than being dropped, so both lines
 * share one x-domain and a genuine zero-activity day reads as zero instead of as a gap.
 */
export function activeActorsPerBucket(
  response: UsageQueryResponse,
  dimensions: readonly string[]
): { dimension: string; points: { x: Date; y: number }[] }[] {
  const buckets = new Set<number>();
  const perDimension = new Map<string, Map<number, Set<string>>>();
  for (const dimension of dimensions) perDimension.set(dimension, new Map());

  for (const point of response.points) {
    const t = new Date(point.bucket_start).getTime();
    if (!Number.isFinite(t)) continue;
    buckets.add(t);
    if (safeRequests(point) <= 0) continue;
    for (const dimension of dimensions) {
      const value = (point as unknown as Record<string, unknown>)[dimension];
      if (typeof value !== 'string' || value.length === 0) continue;
      const byBucket = perDimension.get(dimension);
      if (!byBucket) continue;
      const seen = byBucket.get(t) ?? new Set<string>();
      seen.add(value);
      byBucket.set(t, seen);
    }
  }

  const ordered = Array.from(buckets).sort((a, b) => a - b);
  return dimensions.map((dimension) => {
    const byBucket = perDimension.get(dimension) ?? new Map<number, Set<string>>();
    return {
      dimension,
      points: ordered.map((t) => ({ x: new Date(t), y: byBucket.get(t)?.size ?? 0 })),
    };
  });
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
  activeActorsPerBucket,
} satisfies Record<DerivedMetricName, (response: UsageQueryResponse, ...rest: never[]) => unknown>;
