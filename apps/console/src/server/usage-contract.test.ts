import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pins the nullability of `UsageSeriesPoint` in `openapi/usage.backend.yaml` against the backend's
 * published contract (`lightbridge-query-api.md`'s response table, mirrored from
 * ADORSYS-GIS/lightbridge-authz `docs/lightbridge-query-api.md`).
 *
 * This exists because `total_cost` silently drifted: lightbridge-authz#729 made it nullable
 * backend-side ("null when no row in this bucket carried a cost -- never 0.0, because 'cost
 * unknown' and 'cost was zero' are different facts", governance#188), the spec here kept saying
 * `type: number`, and the SDK's generated zod validator rejected every response containing a null
 * with `invalid_type ... expected number, received null` -- taking down the whole usage view, not
 * just the affected point. The drift went unnoticed for five days because a stuck backend
 * migration meant production never actually emitted a null until 2026-09-16.
 *
 * The spec is asserted rather than the generated client: `packages/**\/client` is gitignored and
 * regenerated from this file, so the spec is the tracked source of truth and the only thing a
 * reviewer can see in a diff.
 */
describe('UsageSeriesPoint contract', () => {
  const spec = readFileSync(
    path.resolve(__dirname, '../../../../openapi/usage.backend.yaml'),
    'utf8'
  );

  const point = spec.slice(spec.indexOf('    UsageSeriesPoint:'));

  function declaredType(field: string): string {
    const start = point.indexOf(`\n        ${field}:`);
    expect(start, `${field} is missing from UsageSeriesPoint`).toBeGreaterThan(-1);
    const body = point.slice(start + 1);
    const next = body.search(/\n {8}\S/);
    return next === -1 ? body : body.slice(0, next);
  }

  /** Every field the backend documents as "X or null". */
  const NULLABLE = [
    'account_id',
    'project_id',
    'api_key_id',
    'user_id',
    'user_name',
    'model',
    'metric_name',
    'signal_type',
    'azp',
    'billing_plan',
    'total_cost',
    'latency_p50_ms',
    'latency_p95_ms',
    'latency_p99_ms',
  ];

  /** Every field the backend documents as always present and never null. */
  const NON_NULLABLE = [
    'requests',
    'usage_value',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'latency_samples',
  ];

  it.each(NULLABLE)('%s is nullable', (field) => {
    expect(declaredType(field)).toContain("'null'");
  });

  it.each(NON_NULLABLE)('%s is not nullable', (field) => {
    expect(declaredType(field)).not.toContain("'null'");
  });
});
