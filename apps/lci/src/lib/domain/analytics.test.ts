import { describe, expect, it } from 'vitest';

import { feedbackAnalytics, reviewAnalytics } from '../../containers/analytics-fixtures';
import {
  ANALYTICS_PANELS,
  analyticsView,
  bucketFor,
  countDelta,
  feedbackNotes,
  formatDuration,
  panelsFor,
  parseAnalyticsRange,
  rateDelta,
  resolveAnalyticsWindow,
  windowLabel,
  type AnalyticsPanelSpec,
  type AnalyticsUi,
  type FeedbackTotals,
  type ReviewTotals,
} from './analytics';

const ui: AnalyticsUi = {
  scaleFor: () => 'linear',
  onScaleChange: () => {},
  pageFor: () => 0,
  onPageChange: () => {},
};

const PREVIOUS_WEEK = { from: '2026-08-25T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' };

function spec(id: string): AnalyticsPanelSpec {
  const found = ANALYTICS_PANELS.find((panel) => panel.id === id);
  if (!found) throw new Error(`no panel ${id}`);
  return found;
}

const ZERO_REVIEWS: ReviewTotals = {
  runs: 0,
  succeeded: 0,
  failed: 0,
  cancelled: 0,
  active: 0,
  pending: 0,
  p50_duration_secs: null,
  p95_duration_secs: null,
  reviews: 0,
  findings: 0,
  inline: 0,
  deferred: 0,
  out_of_scope: 0,
};

describe('parseAnalyticsRange', () => {
  it('falls back to the default for an absent or unknown value, and takes the first of many', () => {
    expect(parseAnalyticsRange(undefined)).toBe('30d');
    expect(parseAnalyticsRange('fortnight')).toBe('30d');
    expect(parseAnalyticsRange(['last-week', '7d'])).toBe('last-week');
  });
});

describe('resolveAnalyticsWindow', () => {
  const wednesday = Date.parse('2026-09-09T14:30:00.000Z');

  it.each([
    ['this-week', '2026-09-07T00:00:00.000Z', '2026-09-09T14:30:00.000Z', '1 hour'],
    ['last-week', '2026-08-31T00:00:00.000Z', '2026-09-07T00:00:00.000Z', '1 hour'],
    ['this-month', '2026-09-01T00:00:00.000Z', '2026-09-09T14:30:00.000Z', '1 day'],
    ['last-month', '2026-08-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', '1 day'],
    ['7d', '2026-09-03T00:00:00.000Z', '2026-09-09T14:30:00.000Z', '1 hour'],
    ['30d', '2026-08-11T00:00:00.000Z', '2026-09-09T14:30:00.000Z', '1 day'],
    ['90d', '2026-06-12T00:00:00.000Z', '2026-09-09T14:30:00.000Z', '1 day'],
  ] as const)('%s is [%s, %s) by %s', (range, from, to, bucket) => {
    const window = resolveAnalyticsWindow(range, wednesday);
    expect(window.from.toISOString()).toBe(from);
    expect(window.to.toISOString()).toBe(to);
    expect(window.bucket).toBe(bucket);
  });

  it('starts the week on Monday even when asked on a Sunday', () => {
    const sunday = Date.parse('2026-09-13T20:00:00.000Z');
    expect(resolveAnalyticsWindow('this-week', sunday).from.toISOString()).toBe(
      '2026-09-07T00:00:00.000Z'
    );
  });

  it('never hands the control plane an empty window at the very start of a week', () => {
    const monday = Date.parse('2026-09-07T00:00:00.000Z');
    const window = resolveAnalyticsWindow('this-week', monday);
    expect(window.to.getTime()).toBeGreaterThan(window.from.getTime());
  });
});

describe('bucketFor', () => {
  it('is hourly to a week, daily to a quarter, weekly beyond', () => {
    const day = 86_400_000;
    expect(bucketFor(7 * day)).toBe('1 hour');
    expect(bucketFor(7 * day + 1)).toBe('1 day');
    expect(bucketFor(90 * day)).toBe('1 day');
    expect(bucketFor(90 * day + 1)).toBe('7 days');
  });
});

describe('windowLabel', () => {
  it('states the end inclusively, so a window ending at midnight never claims that day', () => {
    expect(windowLabel(PREVIOUS_WEEK)).toBe('Aug 25 – Aug 31');
  });

  it('names a window inside one day once', () => {
    expect(windowLabel({ from: '2026-09-09T00:00:00Z', to: '2026-09-09T14:30:00Z' })).toBe('Sep 9');
  });
});

describe('countDelta / rateDelta', () => {
  it('reads a count change as a percentage against named dates', () => {
    expect(countDelta(12, 10, PREVIOUS_WEEK)).toEqual({
      direction: 'up',
      label: '20% vs Aug 25 – Aug 31',
    });
    expect(countDelta(8, 10, PREVIOUS_WEEK)).toEqual({
      direction: 'down',
      label: '20% vs Aug 25 – Aug 31',
    });
    expect(countDelta(5, 5, PREVIOUS_WEEK).direction).toBe('flat');
    expect(countDelta(3, 0, PREVIOUS_WEEK).label).toBe('up from 0 vs Aug 25 – Aug 31');
    expect(countDelta(1001, 1000, PREVIOUS_WEEK).label).toBe('<1% vs Aug 25 – Aug 31');
  });

  it('reads a rate change in points, and says nothing when either side has no rate', () => {
    expect(rateDelta(0.55, 0.5, PREVIOUS_WEEK)).toEqual({
      direction: 'up',
      label: '5 pts vs Aug 25 – Aug 31',
    });
    expect(rateDelta(null, 0.5, PREVIOUS_WEEK)).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('is compact at every magnitude and honest about no data', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(611.4)).toBe('10m 11s');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(null)).toBe('—');
  });
});

describe('the panel list', () => {
  it('has unique ids, and lists repositories on the estate page only', () => {
    const ids = ANALYTICS_PANELS.map((panel) => panel.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(panelsFor('estate').some((panel) => panel.id === 'repositories')).toBe(true);
    expect(panelsFor('repository').some((panel) => panel.id === 'repositories')).toBe(false);
  });

  it('every adapter produces the panel type its entry declares, on both pages', () => {
    const data = { reviews: reviewAnalytics(), feedback: feedbackAnalytics() };
    for (const scope of ['estate', 'repository'] as const) {
      for (const panel of panelsFor(scope)) {
        expect(analyticsView(panel, data, ui)?.kind, panel.id).toBe(panel.type);
      }
    }
  });

  it('a panel whose request failed has no view, and the other source is untouched', () => {
    const data = { reviews: reviewAnalytics(), feedback: null };
    expect(analyticsView(spec('acceptance'), data, ui)).toBeNull();
    expect(analyticsView(spec('reviews'), data, ui)).not.toBeNull();
  });
});

describe('adapters hold the honesty rules', () => {
  const baseFeedback = feedbackAnalytics().current;
  const feedbackWith = (current: Partial<FeedbackTotals>) =>
    feedbackAnalytics({ current: { ...baseFeedback, ...current } });

  it('the acceptance rate is the control plane’s 👍/(👍+👎), never diluted by other reactions', () => {
    const view = analyticsView(
      spec('acceptance'),
      { reviews: null, feedback: feedbackWith({ up: 2, down: 3, other: 40, approval_rate: 0.4 }) },
      ui
    );
    expect(view).toMatchObject({ kind: 'stat', metric: '40%' });
  });

  it('coverage states how many posted comments carried a reaction at all', () => {
    const view = analyticsView(
      spec('coverage'),
      { reviews: null, feedback: feedbackWith({ reacted_inline: 3, inline_comments: 900 }) },
      ui
    );
    expect(view).toMatchObject({ kind: 'stat', metric: '3 of 900' });
  });

  it('a count board formats counts, not money, and draws nothing over a window with no runs', () => {
    const populated = analyticsView(
      spec('runs-over-time'),
      { reviews: reviewAnalytics(), feedback: null },
      ui
    );
    if (populated?.kind !== 'series') throw new Error('expected a series view');
    expect(populated.formatYTick?.(1200)).toBe('1,200');
    expect(populated.series.map((line) => line.key)).toEqual(['succeeded', 'failed', 'cancelled']);

    const empty = analyticsView(
      spec('runs-over-time'),
      { reviews: reviewAnalytics({ current: ZERO_REVIEWS }), feedback: null },
      ui
    );
    expect(empty).toMatchObject({
      kind: 'series',
      series: [],
      emptyMessage: 'No runs in this window.',
    });
  });

  it('priorities are drawn P0 → P2 whatever order they arrive in, and empty ones are left out', () => {
    const view = analyticsView(
      spec('findings-by-priority'),
      {
        reviews: reviewAnalytics({
          by_priority: [
            { key: 'P2', count: 9 },
            { key: 'P0', count: 1 },
          ],
        }),
        feedback: null,
      },
      ui
    );
    if (view?.kind !== 'share') throw new Error('expected a share view');
    expect(view.segments.map((segment) => segment.key)).toEqual(['P0', 'P2']);
  });

  it('the repositories table links to each repository’s insights, and says "—" for reactions it could not load', () => {
    const reviews = reviewAnalytics();
    const withFeedback = analyticsView(
      spec('repositories'),
      { reviews, feedback: feedbackAnalytics() },
      ui
    );
    const withoutFeedback = analyticsView(spec('repositories'), { reviews, feedback: null }, ui);
    if (withFeedback?.kind !== 'table' || withoutFeedback?.kind !== 'table') {
      throw new Error('expected table views');
    }
    expect(withFeedback.rows[0]?.href).toBe('/repositories/2/insights');
    expect(withFeedback.rows[0]?.cells.down).toBe('12');
    expect(withoutFeedback.rows[0]?.cells.down).toBe('—');
  });

  it('an unmatched down-voted comment keeps its row, says it has no finding, and the repository column is estate-only', () => {
    const estate = analyticsView(
      spec('most-downvoted'),
      { reviews: null, feedback: feedbackAnalytics() },
      ui
    );
    const scoped = analyticsView(
      spec('most-downvoted'),
      { reviews: null, feedback: feedbackAnalytics({ repository_id: 2 }) },
      ui
    );
    if (estate?.kind !== 'table' || scoped?.kind !== 'table')
      throw new Error('expected table views');
    expect(estate.rows[1]?.cells.finding).toBe('Unmatched comment');
    expect(estate.rows[1]?.href).toBe('/runs/tsk_02b7n9q1wxy4');
    expect(estate.columns[0]?.key).toBe('repository');
    expect(scoped.columns.some((column) => column.key === 'repository')).toBe(false);
  });
});

describe('feedbackNotes', () => {
  const now = Date.parse('2026-09-09T14:30:00.000Z');

  it('says where reactions stop being refreshed when the window reaches past the poll window', () => {
    const notes = feedbackNotes(
      feedbackAnalytics({ current: { ...feedbackAnalytics().current, unresolved: 0 } }),
      now
    );
    expect(notes).toEqual([
      '👍/👎 on comments posted before Aug 26 are no longer refreshed — reactions are kept current for 14 days after a review.',
    ]);
  });

  it('says nothing about freshness for a window inside the poll window', () => {
    const recent = feedbackAnalytics({
      window: { from: '2026-09-03T00:00:00.000Z', to: '2026-09-09T14:30:00.000Z' },
      current: { ...feedbackAnalytics().current, unresolved: 0 },
    });
    expect(feedbackNotes(recent, now)).toEqual([]);
  });

  it('counts the reactions that matched no finding, instead of letting them vanish from the breakdowns', () => {
    const recent = feedbackAnalytics({
      window: { from: '2026-09-03T00:00:00.000Z', to: '2026-09-09T14:30:00.000Z' },
      current: { ...feedbackAnalytics().current, unresolved: 1 },
    });
    expect(feedbackNotes(recent, now)).toEqual([
      '1 reaction is on a comment that matched no finding: counted in the acceptance rate, but not by priority or category.',
    ]);
  });
});
