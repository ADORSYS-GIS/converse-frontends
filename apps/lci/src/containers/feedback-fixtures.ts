import type { FeedbackAnalyticsResponse, FeedbackSeriesPoint } from '../lib/domain/feedback';

/**
 * A feedback response for the `FeedbackBoard` tests and stories — shaped like what
 * `GET /analytics/feedback` returns for "Last 30 days", with totals that agree with their own series
 * so a story never shows a headline the chart beneath it contradicts.
 *
 * Deliberately uneven: quiet weekends, one repository taking most of the 👎, and a handful of
 * reactions that are neither 👍 nor 👎 — a fixture where every figure is tidy reviews nothing.
 */

export const FEEDBACK_NOW = Date.parse('2026-09-09T14:30:00.000Z');

const DAY = 86_400_000;
const FROM = Date.parse('2026-08-11T00:00:00.000Z');

const WINDOW = { from: new Date(FROM).toISOString(), to: new Date(FEEDBACK_NOW).toISOString() };
const PREVIOUS_WINDOW = {
  from: new Date(FROM - (FEEDBACK_NOW - FROM)).toISOString(),
  to: new Date(FROM).toISOString(),
};

const COMMENTS_PER_WEEKDAY = [18, 24, 15, 21, 12, 0, 3];

function series(): FeedbackSeriesPoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const comments = COMMENTS_PER_WEEKDAY[index % 7] ?? 0;
    return {
      bucket_start: new Date(FROM + index * DAY).toISOString(),
      inline_comments: comments,
      up: index % 2 === 0 ? Math.round(comments * 0.2) : Math.round(comments * 0.1),
      down: index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : 0,
    };
  });
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

export function feedbackAnalytics(
  overrides: Partial<FeedbackAnalyticsResponse> = {}
): FeedbackAnalyticsResponse {
  const points = series();
  const up = sum(points, (point) => point.up);
  const down = sum(points, (point) => point.down);
  return {
    repository_id: null,
    window: WINDOW,
    previous_window: PREVIOUS_WINDOW,
    bucket: '1 day',
    poll_window_days: 14,
    current: {
      inline_comments: sum(points, (point) => point.inline_comments),
      reacted_inline: Math.round((up + down) * 0.85),
      up,
      down,
      other: 9,
      reactors: 11,
      reply_up: 14,
      reply_down: 2,
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
      approval_rate: 30 / 42,
    },
    series: points,
    by_repository: [
      {
        repository_id: 2,
        owner: 'adorsys-gis',
        name: 'converse-frontends',
        platform: 'github',
        inline_comments: 171,
        up: 34,
        down: 12,
        approval_rate: 34 / 46,
      },
      {
        repository_id: 1,
        owner: 'adorsys-gis',
        name: 'lightbridge-authz',
        platform: 'github',
        inline_comments: 96,
        up: 21,
        down: 3,
        approval_rate: 21 / 24,
      },
      {
        repository_id: 3,
        owner: 'adorsys-gis',
        name: 'lightbridge-code-intelligence',
        platform: 'gitlab',
        inline_comments: 61,
        up: 9,
        down: 1,
        approval_rate: 0.9,
      },
    ],
    by_repository_truncated: false,
    ...overrides,
  };
}

/** One repository's response: no `by_repository`, and a rate built on very few reactions. */
export function repositoryFeedbackAnalytics(
  overrides: Partial<FeedbackAnalyticsResponse> = {}
): FeedbackAnalyticsResponse {
  const estate = feedbackAnalytics();
  return {
    ...estate,
    repository_id: 2,
    by_repository: null,
    ...overrides,
  };
}
