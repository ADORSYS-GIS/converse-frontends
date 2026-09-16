/**
 * Pure CSV-building helpers for `/api/reports/consumption` (ticket #308, ADR 0009 Decision 8:
 * "streams a CSV download, grouped by project × model, with totals"). Kept dependency-free and
 * separate from the route handler so the grouping/totals/formatting logic is testable without a
 * `NextRequest`, a session, or a mocked upstream fetch.
 *
 * The usage backend's `/usage/v1/usage/query` (`openapi/usage.backend.yaml`) takes a `group_by`
 * list, but its own bucketing behaviour when `bucket` is omitted is not documented anywhere in
 * this repo. Rather than assume the backend returns exactly one point per (project, model) for
 * the requested range, `aggregateConsumptionRows` sums every point it is given into its
 * (project, model) group — correct regardless of how many time buckets the backend happens to
 * split the range into underneath.
 */

/**
 * Micro-USD -> USD.
 *
 * `usage_events.total_cost` is micro-USD, NOT dollars. That is a stated unit contract in
 * `lightbridge-authz` (`crates/lightbridge-authz-budget/src/spend.rs`): the gateway's
 * `llm_custom_total_cost` CEL is its only production writer, it emits micro-USD, and ingest lands
 * the value verbatim with no scaling. Rendering the raw number as dollars overstates spend by
 * 10^6 -- the same mistake lightbridge-authz#488 fixed on the backend, where `spend.rs` used to
 * multiply by 1_000_000 on the way in.
 *
 * Lives here, in the one module documented as pure and dependency-free, so both the CSV report and
 * the Overview dashboard share a single definition. A second copy of `/ 1_000_000` somewhere else
 * is precisely how the two halves drift apart again.
 */
export function microUsdToUsd(microUsd: number): number {
  return microUsd / 1_000_000;
}

/** The subset of `UsageSeriesPoint` (`openapi/usage.backend.yaml`) this route reads.
 *
 *  `total_cost` is `number | null`, matching the generated schema: the backend returns `null` for
 *  a bucket no `usage_events` row matched, deliberately distinct from `0.0` (lightbridge-authz#729).
 *  This route reaches the backend with a plain `fetch` + `.json()` (`server/reports/usage-fetch.ts`),
 *  not the generated, Zod-validated SDK client, so it was never protected by that schema at
 *  runtime — declaring `total_cost: number` here was a silent type lie once the backend started
 *  emitting real nulls, not a compile error. See `safePointCost` below. */
export type UsageSeriesPoint = {
  project_id?: string | null;
  model?: string | null;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost: number | null;
};

/** A finite, non-negative cost — the same "malformed/null total_cost renders as 0 for THIS point
 *  alone" guard `overview-usage.ts`'s `safeCost` applies to the Overview dashboard's own points.
 *  Not imported from there: `overview-usage.ts` already imports `microUsdToUsd` FROM this module,
 *  so importing `safeCost` back would be a circular dependency between the two — kept in sync by
 *  hand instead, and both must keep applying the same "point defends" convention.
 *
 *  A report row sums many buckets into one number, so it cannot show "unknown" for a single bucket
 *  without misstating the total of the ones that ARE known — the same reasoning `safeCost`'s own
 *  doc comment gives for the Overview dashboard's charts. A caller needing the null/zero
 *  distinction for one bucket must read `point.total_cost` directly, same as there. */
function safePointCost(point: Pick<UsageSeriesPoint, 'total_cost'>): number {
  const raw = point.total_cost;
  return raw !== null && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export type ConsumptionRow = {
  projectId: string;
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostMicroUsd: number;
};

/** Renders for a point the usage backend returned with no project/model attached — a real,
 *  nameable state (e.g. usage recorded before a model dimension existed), never dropped silently. */
export const UNATTRIBUTED = '(unattributed)';

function zeroTotals(): Omit<ConsumptionRow, 'projectId' | 'model'> {
  return {
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    totalCostMicroUsd: 0,
  };
}

/** Groups usage points by (project, model), summing every numeric field. Sorted by project then
 *  model so the CSV output — and therefore any test asserting on it — is deterministic. */
export function aggregateConsumptionRows(points: readonly UsageSeriesPoint[]): ConsumptionRow[] {
  const groups = new Map<string, ConsumptionRow>();

  for (const point of points) {
    const projectId = point.project_id?.trim() || UNATTRIBUTED;
    const model = point.model?.trim() || UNATTRIBUTED;
    const key = `${projectId} ${model}`;

    const existing = groups.get(key);
    if (existing) {
      existing.requests += point.requests;
      existing.promptTokens += point.prompt_tokens;
      existing.completionTokens += point.completion_tokens;
      existing.totalTokens += point.total_tokens;
      existing.totalCostMicroUsd += safePointCost(point);
    } else {
      groups.set(key, {
        projectId,
        model,
        requests: point.requests,
        promptTokens: point.prompt_tokens,
        completionTokens: point.completion_tokens,
        totalTokens: point.total_tokens,
        totalCostMicroUsd: safePointCost(point),
      });
    }
  }

  return [...groups.values()].sort((a, b) =>
    a.projectId === b.projectId
      ? a.model.localeCompare(b.model)
      : a.projectId.localeCompare(b.projectId)
  );
}

/** The TOTAL row — a real sum over every group actually returned, never fabricated. */
export function consumptionTotals(rows: readonly ConsumptionRow[]) {
  return rows.reduce((acc, row) => {
    acc.requests += row.requests;
    acc.promptTokens += row.promptTokens;
    acc.completionTokens += row.completionTokens;
    acc.totalTokens += row.totalTokens;
    acc.totalCostMicroUsd += row.totalCostMicroUsd;
    return acc;
  }, zeroTotals());
}

const CSV_HEADER = [
  'project',
  'model',
  'requests',
  'prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'total_cost_usd',
] as const;

/** RFC 4180 field quoting — only when the field actually needs it. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvLine(fields: readonly (string | number)[]): string {
  return `${fields.map(csvField).join(',')}\r\n`;
}

/**
 * The CSV as an array of complete lines (header, one per (project, model) group, then TOTAL) —
 * not yet joined into one string, so the route can enqueue them one at a time instead of building
 * the whole document in memory before the response starts.
 */
export function consumptionCsvLines(rows: readonly ConsumptionRow[]): string[] {
  const lines = [csvLine(CSV_HEADER)];
  for (const row of rows) {
    lines.push(
      csvLine([
        row.projectId,
        row.model,
        row.requests,
        row.promptTokens,
        row.completionTokens,
        row.totalTokens,
        microUsdToUsd(row.totalCostMicroUsd).toFixed(6),
      ])
    );
  }
  const totals = consumptionTotals(rows);
  lines.push(
    csvLine([
      'TOTAL',
      '',
      totals.requests,
      totals.promptTokens,
      totals.completionTokens,
      totals.totalTokens,
      microUsdToUsd(totals.totalCostMicroUsd).toFixed(6),
    ])
  );
  return lines;
}

/** Streams the lines one enqueue at a time — the route's response body, not a buffered string. */
export function streamConsumptionCsv(rows: readonly ConsumptionRow[]): ReadableStream<Uint8Array> {
  const lines = consumptionCsvLines(rows);
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= lines.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(lines[index]));
      index += 1;
    },
  });
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `YYYY-MM`, matching `CURRENT_PERIOD`/`manageParsers.period` in `client/url-state.ts`. */
export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

/** The month's `[start, end)` boundary as UTC ISO instants, for the usage query's
 *  `start_time`/`end_time`. Assumes `isValidMonth(month)` was already checked by the caller. */
export function monthRange(month: string): { startTime: string; endTime: string } {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}
