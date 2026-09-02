import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { parseDashboardsFile, type DashboardPageSpec } from './dashboard-spec';
import { autoBucket, queryKey, resolveDashboard } from './resolve-dashboard';

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;

/** A window ending at a fixed instant, `days` long — every test below is clock-free. */
function windowOf(days: number) {
  const end = at('2026-09-01T00:00:00Z');
  return { start: new Date(end.getTime() - days * DAY), end };
}

function page(panels: DashboardPageSpec['panels'], route = '/x'): DashboardPageSpec {
  return { route, filters: [], panels };
}

const statPanel = (id: string, overrides: Partial<DashboardPageSpec['panels'][number]> = {}) =>
  ({
    id,
    type: 'stat',
    title: id,
    span: 1,
    metric: 'cost',
    query: { scope: 'all', bucket: 'auto', limit: 2000 },
    ...overrides,
  }) as DashboardPageSpec['panels'][number];

describe('autoBucket', () => {
  it.each([
    [1, '1 hour'],
    [7, '1 hour'],
    [8, '1 day'],
    [90, '1 day'],
    [91, '7 days'],
    [365, '7 days'],
  ])('resolves a %d-day range to "%s"', (days, expected) => {
    expect(autoBucket(windowOf(days))).toBe(expected);
  });

  /** `1 week` is refused outright by the backend's own `validate_bucket_interval`; `7 days` is the
   *  same width and is accepted. */
  it('never emits "1 week"', () => {
    for (const days of [1, 7, 30, 90, 200, 400]) {
      expect(autoBucket(windowOf(days))).not.toBe('1 week');
    }
  });
});

describe('placeholder substitution', () => {
  it('substitutes scope, scope_id and a filter value from the page filters', () => {
    const resolved = resolveDashboard({
      page: page(
        [
          statPanel('p', {
            query: {
              scope: '$type',
              scope_id: '$actorId',
              filters: { azp: '$channelId' },
              bucket: 'auto',
              limit: 100,
            },
          }),
        ],
        '/admin/usage/actors/[actorId]'
      ),
      window: windowOf(30),
      filters: { type: 'account', actorId: 'acc_1', channelId: 'console' },
    });

    expect(resolved.queries[0]).toMatchObject({
      scope: 'account',
      scope_id: 'acc_1',
      filters: { azp: 'console' },
    });
  });

  /**
   * The AC: an unresolved placeholder is an ERROR. An empty `scope_id` on an account-scoped query
   * is not "no actor" — it is a query about something other than what the panel's title says, and
   * on `scope: all` it would silently widen to the whole estate.
   */
  it.each([
    ['missing entirely', {}],
    ['present but empty', { actorId: '' }],
  ])(
    'throws on an unresolved placeholder (%s), naming the page, panel and field',
    (_l, filters) => {
      expect(() =>
        resolveDashboard({
          page: page(
            [statPanel('actor-cost', { query: { scope_id: '$actorId', limit: 10 } })],
            '/admin/usage/actors/[actorId]'
          ),
          window: windowOf(30),
          filters,
        })
      ).toThrow(/\$actorId.*\/admin\/usage\/actors\/\[actorId\].*actor-cost.*scope_id/s);
    }
  );

  it('leaves a literal alone and never interpolates inside a longer string', () => {
    const resolved = resolveDashboard({
      page: page([
        statPanel('p', { query: { scope: 'all', scope_id: 'acct-$actorId', limit: 10 } }),
      ]),
      window: windowOf(30),
      filters: { actorId: 'x' },
    });
    expect(resolved.queries[0].scope_id).toBe('acct-$actorId');
  });

  it('defaults an omitted scope to the estate-wide pair the backend documents', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('p', { query: { limit: 10 } })]),
      window: windowOf(30),
    });
    expect(resolved.queries[0]).toMatchObject({ scope: 'all', scope_id: '' });
  });
});

describe('the range is always applied', () => {
  it('stamps every panel with the page window, whatever the panel declared', () => {
    const window = windowOf(30);
    const resolved = resolveDashboard({
      page: page([
        statPanel('a'),
        statPanel('b', { query: { scope: 'account', scope_id: 'x', limit: 5 } }),
      ]),
      window,
    });
    for (const query of resolved.queries) {
      expect(query.start_time).toBe(window.start.toISOString());
      expect(query.end_time).toBe(window.end.toISOString());
    }
  });

  it('emits an explicit limit on every query', () => {
    const resolved = resolveDashboard({ page: page([statPanel('a')]), window: windowOf(30) });
    expect(resolved.queries[0].limit).toBe(2000);
  });
});

describe('dedupe', () => {
  /** The AC, verbatim: "every ungrouped `stat` panel on a page shares a single request." */
  it('collapses identical queries to ONE request', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('a'), statPanel('b'), statPanel('c'), statPanel('d')]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(1);
    expect(resolved.panels.map((p) => p.queryIndex)).toEqual([0, 0, 0, 0]);
  });

  it('keeps a NEAR-identical query separate — a dimension changes what comes back', () => {
    const resolved = resolveDashboard({
      page: page([
        statPanel('a'),
        statPanel('b', {
          query: { scope: 'all', group_by: ['model'], bucket: 'auto', limit: 2000 },
        }),
        statPanel('c', { query: { scope: 'all', bucket: '1 hour', limit: 2000 } }),
        statPanel('d', { query: { scope: 'all', bucket: 'auto', limit: 500 } }),
        statPanel('e', {
          query: { scope: 'all', filters: { model: 'gpt-4o' }, bucket: 'auto', limit: 2000 },
        }),
      ]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(5);
  });

  /** Dedupe is over the RESOLVED query, not the authored one: `bucket: auto` that lands on the
   *  same width as a hand-pinned `1 day` genuinely IS the same request, and sharing it is the
   *  point. This is the flip side of the assertion above, stated so the behaviour is deliberate
   *  rather than incidental. */
  it('shares a request between `auto` and an explicit bucket that resolve the same', () => {
    const resolved = resolveDashboard({
      page: page([
        statPanel('a'),
        statPanel('b', { query: { scope: 'all', bucket: '1 day', limit: 2000 } }),
      ]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(1);
  });

  it('treats group_by/filter ORDER as immaterial — it does not change the response', () => {
    const a = statPanel('a', {
      query: { scope: 'all', group_by: ['model', 'user_id'], bucket: 'auto', limit: 10 },
    });
    const b = statPanel('b', {
      query: { scope: 'all', group_by: ['user_id', 'model'], bucket: 'auto', limit: 10 },
    });
    expect(resolveDashboard({ page: page([a, b]), window: windowOf(30) }).queries).toHaveLength(1);
  });

  it('produces a stable key regardless of key insertion order', () => {
    const left = queryKey({
      scope: 'all',
      scope_id: '',
      start_time: 'a',
      end_time: 'b',
      bucket: '1 day',
      filters: { model: 'x', azp: 'y' },
      limit: 1,
    });
    const right = queryKey({
      scope: 'all',
      scope_id: '',
      start_time: 'a',
      end_time: 'b',
      bucket: '1 day',
      filters: { azp: 'y', model: 'x' },
      limit: 1,
    });
    expect(left).toBe(right);
  });
});

describe('compare twins', () => {
  it('adds a twin over the comparison window, and only for panels that asked', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true }), statPanel('b')]),
      window: windowOf(30),
      resetCadence: 'weekly',
    });

    expect(resolved.queries).toHaveLength(2);
    const [withCompare, plain] = resolved.panels;
    expect(withCompare.compareQueryIndex).toBe(1);
    expect(withCompare.compareCadence).toBe('weekly');
    expect(plain.compareQueryIndex).toBeUndefined();

    const twin = resolved.queries[1];
    expect(twin.end_time).toBe(resolved.queries[0].start_time);
  });

  /**
   * A SERIES overlay has to be re-based forward or it doubles the chart's x-domain and squeezes
   * the current period into half the board — the 2026-08-31 owner finding. The shift is the gap
   * between the two windows' starts, which for a fixed-length cadence is exactly the span.
   */
  it('reports how far forward the twin must be shifted to overlay the current window', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true })]),
      window: windowOf(30),
      resetCadence: 'weekly',
    });
    const [panel] = resolved.panels;
    const current = resolved.queries[panel.queryIndex];
    const twin = resolved.queries[panel.compareQueryIndex as number];
    expect(panel.compareShiftMs).toBe(Date.parse(current.start_time) - Date.parse(twin.start_time));
    // Weekly snapping rounds 30 days up to 35, so the shift is that snapped span, not 30 days.
    expect(panel.compareShiftMs).toBe(35 * 86_400_000);
  });

  it('leaves the shift undefined for a panel that does not compare', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true }), statPanel('b')]),
      window: windowOf(30),
    });
    expect(resolved.panels[1].compareShiftMs).toBeUndefined();
  });

  it('deduplicates the twin like any other query', () => {
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true }), statPanel('b', { compare: true })]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(2);
    expect(resolved.panels[0].compareQueryIndex).toBe(resolved.panels[1].compareQueryIndex);
  });

  /**
   * Both sides of a comparison must be the same length, so a widened current window moves the
   * NON-comparing panels too — otherwise two panels on one page would report different totals for
   * what the range picker calls the same window.
   */
  it('moves every panel onto the widened window when the comparison widened it', () => {
    const oneDay = windowOf(1);
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true }), statPanel('b')]),
      window: oneDay,
      resetCadence: 'daily',
    });
    expect(resolved.window.end.getTime() - resolved.window.start.getTime()).toBe(7 * DAY);
    for (const query of resolved.queries) {
      expect(new Date(query.end_time).getTime()).toBeLessThanOrEqual(oneDay.end.getTime());
    }
    expect(resolved.queries[0].start_time).toBe(resolved.window.start.toISOString());
  });

  it('leaves the page window untouched when no panel compares', () => {
    const oneDay = windowOf(1);
    const resolved = resolveDashboard({ page: page([statPanel('a')]), window: oneDay });
    expect(resolved.window.start.toISOString()).toBe(oneDay.start.toISOString());
  });
});

describe('the checked-in page entry', () => {
  const file = parseDashboardsFile(
    parseYaml(readFileSync(join(import.meta.dirname, '..', '..', 'dashboards.yaml'), 'utf8')),
    'dashboards.yaml'
  );

  it('resolves with fewer requests than it has panels — that IS the dedupe', () => {
    const usage = file.pages.find((p) => p.route === '/admin/usage');
    if (!usage) throw new Error('/admin/usage entry missing');

    const resolved = resolveDashboard({ page: usage, window: windowOf(30) });
    expect(resolved.panels).toHaveLength(usage.panels.length);
    expect(resolved.queries.length).toBeLessThan(usage.panels.length);

    // The three ungrouped stats (total cost, total requests, avg cost per million tokens) all
    // point at the same request.
    const ungrouped = resolved.panels.filter((p) => !p.spec.query.group_by);
    expect(new Set(ungrouped.map((p) => p.queryIndex)).size).toBe(1);
  });
});
