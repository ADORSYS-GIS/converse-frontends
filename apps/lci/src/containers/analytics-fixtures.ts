import type {
  FeedbackAnalyticsResponse,
  ReviewAnalyticsResponse,
  ReviewSeriesPoint,
} from '../lib/domain/analytics';

/**
 * Analytics responses for the `AnalyticsBoard` tests and stories — shaped like what
 * `GET /analytics/reviews` and `GET /analytics/feedback` return for "Last 30 days", with totals that
 * agree with their own series so a story never shows a headline the chart beneath it contradicts.
 *
 * Deliberately uneven: quiet weekends, one failure-heavy repository, a 👎-heavy style category, and
 * one reaction that matched no finding — a fixture where every figure is tidy reviews nothing.
 */

export const ANALYTICS_NOW = Date.parse('2026-09-09T14:30:00.000Z');

const DAY = 86_400_000;
const FROM = Date.parse('2026-08-11T00:00:00.000Z');

const WINDOW = { from: new Date(FROM).toISOString(), to: new Date(ANALYTICS_NOW).toISOString() };
const PREVIOUS_WINDOW = {
  from: new Date(FROM - (ANALYTICS_NOW - FROM)).toISOString(),
  to: new Date(FROM).toISOString(),
};

const RUNS_PER_WEEKDAY = [6, 8, 5, 7, 4, 0, 1];

function reviewSeries(): ReviewSeriesPoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const runs = RUNS_PER_WEEKDAY[index % 7] ?? 0;
    const failed = runs > 0 && index % 4 === 0 ? 2 : 0;
    const cancelled = runs > 3 && index % 6 === 0 ? 1 : 0;
    const succeeded = runs - failed - cancelled;
    return {
      bucket_start: new Date(FROM + index * DAY).toISOString(),
      runs,
      succeeded,
      failed,
      cancelled,
      reviews: succeeded,
      findings: succeeded * 3 + (index % 3),
    };
  });
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

export function reviewAnalytics(
  overrides: Partial<ReviewAnalyticsResponse> = {}
): ReviewAnalyticsResponse {
  const series = reviewSeries();
  const findings = sum(series, (point) => point.findings);
  const p0 = Math.round(findings * 0.08);
  const p1 = Math.round(findings * 0.31);
  return {
    repository_id: null,
    window: WINDOW,
    previous_window: PREVIOUS_WINDOW,
    bucket: '1 day',
    current: {
      runs: sum(series, (point) => point.runs),
      succeeded: sum(series, (point) => point.succeeded),
      failed: sum(series, (point) => point.failed),
      cancelled: sum(series, (point) => point.cancelled),
      active: 1,
      pending: 2,
      p50_duration_secs: 142,
      p95_duration_secs: 611.4,
      reviews: sum(series, (point) => point.reviews),
      findings,
      inline: Math.round(findings * 0.72),
      deferred: Math.round(findings * 0.24),
      out_of_scope: 4,
    },
    previous: {
      runs: 118,
      succeeded: 96,
      failed: 15,
      cancelled: 7,
      active: 0,
      pending: 0,
      p50_duration_secs: 150,
      p95_duration_secs: 702,
      reviews: 96,
      findings: 301,
      inline: 214,
      deferred: 81,
      out_of_scope: 6,
    },
    series,
    by_priority: [
      { key: 'P2', count: findings - p0 - p1 },
      { key: 'P1', count: p1 },
      { key: 'P0', count: p0 },
    ],
    by_category: [
      { key: 'correctness', count: Math.round(findings * 0.41) },
      { key: 'quality', count: Math.round(findings * 0.23) },
      { key: 'style', count: Math.round(findings * 0.18) },
      { key: 'security', count: Math.round(findings * 0.11) },
      { key: 'performance', count: Math.round(findings * 0.07) },
    ],
    by_repository: [
      {
        repository_id: 2,
        owner: 'adorsys-gis',
        name: 'converse-frontends',
        platform: 'github',
        runs: 61,
        succeeded: 50,
        failed: 8,
        reviews: 50,
        findings: 171,
      },
      {
        repository_id: 1,
        owner: 'adorsys-gis',
        name: 'lightbridge-authz',
        platform: 'github',
        runs: 38,
        succeeded: 33,
        failed: 3,
        reviews: 33,
        findings: 96,
      },
      {
        repository_id: 3,
        owner: 'adorsys-gis',
        name: 'lightbridge-code-intelligence',
        platform: 'gitlab',
        runs: 22,
        succeeded: 19,
        failed: 3,
        reviews: 19,
        findings: 61,
      },
    ],
    by_repository_truncated: false,
    ...overrides,
  };
}

export function feedbackAnalytics(
  overrides: Partial<FeedbackAnalyticsResponse> = {}
): FeedbackAnalyticsResponse {
  const series = reviewSeries().map((point, index) => ({
    bucket_start: point.bucket_start,
    inline_comments: point.findings,
    up: index % 2 === 0 ? Math.round(point.findings * 0.2) : Math.round(point.findings * 0.1),
    down: index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
  }));
  const up = sum(series, (point) => point.up);
  const down = sum(series, (point) => point.down);
  return {
    repository_id: null,
    window: WINDOW,
    previous_window: PREVIOUS_WINDOW,
    bucket: '1 day',
    poll_window_days: 14,
    current: {
      inline_comments: sum(series, (point) => point.inline_comments),
      reacted_inline: Math.round((up + down) * 0.85),
      up,
      down,
      other: 9,
      reactors: 11,
      reply_up: 14,
      reply_down: 2,
      unresolved: 1,
      approval_rate: up / (up + down),
    },
    previous: {
      inline_comments: 214,
      reacted_inline: 38,
      up: 30,
      down: 12,
      other: 4,
      reactors: 8,
      reply_up: 9,
      reply_down: 3,
      unresolved: 0,
      approval_rate: 30 / 42,
    },
    series,
    by_priority: [
      { key: 'P0', up: 6, down: 1 },
      { key: 'P1', up: 22, down: 6 },
      { key: 'P2', up: Math.max(up - 28, 0), down: Math.max(down - 8, 0) },
    ],
    by_category: [
      { key: 'style', up: 4, down: 9 },
      { key: 'quality', up: 12, down: 4 },
      { key: 'correctness', up: 31, down: 3 },
      { key: 'security', up: 7, down: 0 },
    ],
    top_downvoted: [
      {
        task_id: 'tsk_01j8k2m4pqr7',
        repository_id: 2,
        owner: 'adorsys-gis',
        name: 'converse-frontends',
        platform: 'github',
        target_id: 512,
        file: 'apps/console/src/dashboards/resolve-dashboard.ts',
        line: 214,
        title: 'Prefer a named constant for the bucket ladder',
        priority: 'P2',
        category: 'style',
        downvotes: 3,
      },
      {
        task_id: 'tsk_02b7n9q1wxy4',
        repository_id: 1,
        owner: 'adorsys-gis',
        name: 'lightbridge-authz',
        platform: 'github',
        target_id: 415,
        file: 'crates/lightbridge-authz-usage/src/repo.rs',
        line: 88,
        title: null,
        priority: null,
        category: null,
        downvotes: 1,
      },
    ],
    by_repository: [
      { repository_id: 2, inline_comments: 124, up: 38, down: 12 },
      { repository_id: 1, inline_comments: 70, up: 21, down: 3 },
    ],
    ...overrides,
  };
}
