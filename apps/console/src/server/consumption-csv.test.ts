import { describe, expect, it } from 'vitest';

import {
  UNATTRIBUTED,
  aggregateConsumptionRows,
  consumptionCsvLines,
  consumptionTotals,
  isValidMonth,
  monthRange,
  streamConsumptionCsv,
  type UsageSeriesPoint,
} from './consumption-csv';

const point = (overrides: Partial<UsageSeriesPoint> = {}): UsageSeriesPoint => ({
  project_id: 'proj_1',
  model: 'gpt-4',
  requests: 10,
  prompt_tokens: 100,
  completion_tokens: 50,
  total_tokens: 150,
  total_cost: 1.5,
  ...overrides,
});

describe('aggregateConsumptionRows', () => {
  it('groups by (project, model), summing every numeric field', () => {
    const rows = aggregateConsumptionRows([
      point({ project_id: 'proj_1', model: 'gpt-4', requests: 10, total_cost: 1.5 }),
      point({ project_id: 'proj_1', model: 'gpt-4', requests: 5, total_cost: 0.75 }),
    ]);

    expect(rows).toEqual([
      {
        projectId: 'proj_1',
        model: 'gpt-4',
        requests: 15,
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        totalCost: 2.25,
      },
    ]);
  });

  it('never assumes one point per (project, model) — sums however many buckets the backend returns', () => {
    // Three points for the same (project, model) pair, standing in for a backend that bucketed
    // the requested month into several sub-ranges despite no `bucket` param being sent.
    const rows = aggregateConsumptionRows([
      point({ requests: 1 }),
      point({ requests: 1 }),
      point({ requests: 1 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].requests).toBe(3);
  });

  it('keeps distinct project × model pairs as distinct rows', () => {
    const rows = aggregateConsumptionRows([
      point({ project_id: 'proj_1', model: 'gpt-4' }),
      point({ project_id: 'proj_1', model: 'claude' }),
      point({ project_id: 'proj_2', model: 'gpt-4' }),
    ]);

    expect(rows).toHaveLength(3);
  });

  it('sorts by project then model, deterministically', () => {
    const rows = aggregateConsumptionRows([
      point({ project_id: 'proj_2', model: 'gpt-4' }),
      point({ project_id: 'proj_1', model: 'claude' }),
      point({ project_id: 'proj_1', model: 'gpt-4' }),
    ]);

    expect(rows.map((r) => [r.projectId, r.model])).toEqual([
      ['proj_1', 'claude'],
      ['proj_1', 'gpt-4'],
      ['proj_2', 'gpt-4'],
    ]);
  });

  it('labels a point with no project/model as unattributed rather than dropping it', () => {
    const rows = aggregateConsumptionRows([point({ project_id: null, model: null })]);

    expect(rows).toEqual([
      expect.objectContaining({ projectId: UNATTRIBUTED, model: UNATTRIBUTED }),
    ]);
  });

  it('returns no rows for no points, never a fabricated placeholder row', () => {
    expect(aggregateConsumptionRows([])).toEqual([]);
  });
});

describe('consumptionTotals', () => {
  it('sums every row — a real aggregate, not a per-row echo', () => {
    const rows = aggregateConsumptionRows([
      point({ project_id: 'proj_1', model: 'gpt-4', requests: 10, total_cost: 1.5 }),
      point({ project_id: 'proj_2', model: 'claude', requests: 4, total_cost: 0.5 }),
    ]);

    expect(consumptionTotals(rows)).toEqual({
      requests: 14,
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
      totalCost: 2,
    });
  });

  it('is all zeroes for no rows, not a crash or NaN', () => {
    expect(consumptionTotals([])).toEqual({
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    });
  });
});

describe('consumptionCsvLines', () => {
  it('emits a header row, one row per group, and a TOTAL row', () => {
    const rows = aggregateConsumptionRows([
      point({ project_id: 'proj_1', model: 'gpt-4', requests: 10, total_cost: 1.5 }),
    ]);
    const lines = consumptionCsvLines(rows);

    expect(lines[0]).toBe(
      'project,model,requests,prompt_tokens,completion_tokens,total_tokens,total_cost\r\n'
    );
    expect(lines[1]).toBe('proj_1,gpt-4,10,100,50,150,1.50\r\n');
    expect(lines[2]).toBe('TOTAL,,10,100,50,150,1.50\r\n');
    expect(lines).toHaveLength(3);
  });

  it('quotes a field containing a comma per RFC 4180', () => {
    const rows = aggregateConsumptionRows([point({ project_id: 'proj, with comma' })]);
    const lines = consumptionCsvLines(rows);

    expect(lines[1]).toContain('"proj, with comma"');
  });

  it('renders a totals-only CSV for zero usage rather than an empty file', () => {
    const lines = consumptionCsvLines([]);

    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('TOTAL,,0,0,0,0,0.00\r\n');
  });
});

describe('streamConsumptionCsv', () => {
  it('streams the same content consumptionCsvLines produces, chunk by chunk', async () => {
    const rows = aggregateConsumptionRows([point()]);
    const stream = streamConsumptionCsv(rows);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];

    let result = await reader.read();
    while (!result.done) {
      chunks.push(decoder.decode(result.value));
      result = await reader.read();
    }

    // More than one chunk — the response body is genuinely enqueued line by line, not built as
    // one buffered string ahead of time.
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(consumptionCsvLines(rows).join(''));
  });
});

describe('isValidMonth', () => {
  it.each(['2026-01', '2026-12', '1999-06'])('accepts %s', (month) => {
    expect(isValidMonth(month)).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-1', '2026/01', 'not-a-month', ''])('rejects %s', (month) => {
    expect(isValidMonth(month)).toBe(false);
  });
});

describe('monthRange', () => {
  it('resolves the UTC [start, end) boundary of the month', () => {
    expect(monthRange('2026-02')).toEqual({
      startTime: '2026-02-01T00:00:00.000Z',
      endTime: '2026-03-01T00:00:00.000Z',
    });
  });

  it('rolls over into the next year at December', () => {
    expect(monthRange('2026-12')).toEqual({
      startTime: '2026-12-01T00:00:00.000Z',
      endTime: '2027-01-01T00:00:00.000Z',
    });
  });
});
