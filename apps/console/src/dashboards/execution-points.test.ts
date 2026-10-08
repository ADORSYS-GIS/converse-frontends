import { describe, expect, it } from 'vitest';

import { executionPointToUsagePoint, executionResponseToUsageResponse } from './execution-points';

const POINT = {
  bucket_start: '2026-10-01T00:00:00Z',
  source: 'claude-code',
  model: null,
  provider: null,
  executions_count: 7,
  total_duration_ms: 90_000,
  total_cost: 1_250_000,
  total_input_tokens: 4_000,
  total_output_tokens: 1_000,
  tool_call_count: 12,
};

describe('executionPointToUsagePoint (lightbridge-governance#36)', () => {
  it('maps sessions, integer micro-USD cost and tokens onto the event-grain fields', () => {
    expect(executionPointToUsagePoint(POINT)).toMatchObject({
      bucket_start: '2026-10-01T00:00:00Z',
      source: 'claude-code',
      requests: 7,
      total_cost: 1_250_000,
      prompt_tokens: 4_000,
      completion_tokens: 1_000,
      total_tokens: 5_000,
    });
  });

  it('keeps an unknown cost NULL — unknown is not free (lightbridge-governance#188)', () => {
    expect(executionPointToUsagePoint({ ...POINT, total_cost: null }).total_cost).toBeNull();
  });

  it('reports latency as absent, never as 0 ms — the grain computes no percentiles', () => {
    const point = executionPointToUsagePoint(POINT);
    expect(point.latency_samples).toBe(0);
    expect(point.latency_p50_ms).toBeNull();
    expect(point.latency_p99_ms).toBeNull();
  });

  it('carries the truncation flag through the response mapping', () => {
    expect(executionResponseToUsageResponse({ truncated: true, points: [POINT] })).toMatchObject({
      truncated: true,
      points: [expect.objectContaining({ source: 'claude-code' })],
    });
  });
});
