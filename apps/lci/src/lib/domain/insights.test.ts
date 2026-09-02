import { describe, expect, it } from 'vitest';

import type { Task } from './tasks';
import {
  breakdownByOutcome,
  breakdownByRepo,
  computeKpis,
  formatSeconds,
  runsPerDay,
} from './insights';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    repository_id: 1,
    installation_id: 1,
    webhook_delivery_id: null,
    target_type: 'pull_request',
    target_id: 1,
    command_text: 'review',
    base_sha: null,
    head_sha: null,
    status: 'succeeded',
    priority: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T00:01:00.000Z',
    repo_owner: 'acme',
    repo_name: 'widgets',
    repo_default_branch: 'main',
    repo_platform: 'github',
    job_name: null,
    error_detail: null,
    ...overrides,
  };
}

const now = new Date('2026-01-14T00:00:00.000Z').getTime();

describe('computeKpis', () => {
  it('is honestly empty for no runs at all', () => {
    expect(computeKpis([], now)).toEqual({ total: 0, passRate: null, p50Seconds: null, active: 0 });
  });

  it('computes pass rate only over completed (success + error) runs', () => {
    const tasks = [
      makeTask({ status: 'succeeded' }),
      makeTask({ status: 'succeeded' }),
      makeTask({ status: 'failed' }),
      makeTask({ status: 'queued' }), // pending — excluded from the completed denominator
    ];
    const kpis = computeKpis(tasks, now);
    expect(kpis.total).toBe(4);
    expect(kpis.passRate).toBeCloseTo(2 / 3);
  });

  it('counts active runs separately from pass rate', () => {
    const tasks = [makeTask({ status: 'running' }), makeTask({ status: 'posting_result' })];
    expect(computeKpis(tasks, now).active).toBe(2);
  });

  it('is null, not zero, when nothing has completed', () => {
    const tasks = [makeTask({ status: 'queued' }), makeTask({ status: 'running' })];
    expect(computeKpis(tasks, now).passRate).toBeNull();
  });
});

describe('formatSeconds', () => {
  it('matches the same seconds/minutes/hours shape task duration uses', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(100)).toBe('1m 40s');
    expect(formatSeconds(5400)).toBe('1h 30m');
  });
});

describe('runsPerDay', () => {
  it('zero-fills every day in the window, not just days with runs', () => {
    const buckets = runsPerDay([], now, 5);
    expect(buckets).toHaveLength(5);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('counts a run on the day it was created', () => {
    const tasks = [makeTask({ created_at: '2026-01-14T12:00:00.000Z' })];
    const buckets = runsPerDay(tasks, now, 3);
    expect(buckets.at(-1)).toMatchObject({ key: '2026-01-14', count: 1 });
  });

  it('drops a run outside the requested window rather than miscounting it', () => {
    const tasks = [makeTask({ created_at: '2020-01-01T00:00:00.000Z' })];
    const buckets = runsPerDay(tasks, now, 3);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });
});

describe('breakdownByRepo', () => {
  it('ranks by run count, largest first', () => {
    const tasks = [
      makeTask({ repo_owner: 'a', repo_name: 'one' }),
      makeTask({ repo_owner: 'b', repo_name: 'two' }),
      makeTask({ repo_owner: 'b', repo_name: 'two' }),
    ];
    expect(breakdownByRepo(tasks)).toEqual([
      { label: 'b/two', count: 2 },
      { label: 'a/one', count: 1 },
    ]);
  });

  it('caps at the given limit', () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      makeTask({ repo_owner: 'r', repo_name: `${i}` })
    );
    expect(breakdownByRepo(tasks, 3)).toHaveLength(3);
  });
});

describe('breakdownByOutcome', () => {
  it('omits an outcome with no runs rather than showing a zero row', () => {
    const tasks = [makeTask({ status: 'succeeded' })];
    expect(breakdownByOutcome(tasks)).toEqual([{ label: 'Succeeded', count: 1 }]);
  });

  it('orders outcomes success, failed, running, pending, cancelled', () => {
    const tasks = [
      makeTask({ status: 'cancelled' }),
      makeTask({ status: 'queued' }),
      makeTask({ status: 'running' }),
      makeTask({ status: 'failed' }),
      makeTask({ status: 'succeeded' }),
    ];
    expect(breakdownByOutcome(tasks).map((s) => s.label)).toEqual([
      'Succeeded',
      'Failed',
      'Running',
      'Pending',
      'Cancelled',
    ]);
  });
});
