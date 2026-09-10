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
    expect(withCompare.compareWindow?.end.toISOString()).toBe(resolved.queries[0].start_time);
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
    const current = resolved.queries[panel.queryIndices[0]];
    const twin = resolved.queries[panel.compareQueryIndex as number];
    expect(panel.compareShiftMs).toBe(Date.parse(current.start_time) - Date.parse(twin.start_time));
    // The picked window's OWN span — 30 days, never rounded up to whole weeks. Rounding it
    // would have meant querying 35 days under a header that said 30
    // (converse-frontends#448).
    expect(panel.compareShiftMs).toBe(30 * 86_400_000);
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
   * The 2026-09-03 money incident, as an invariant (converse-frontends#448). Adding a comparison
   * used to WIDEN the page's current window to the one-week floor and move every panel onto it,
   * comparing and non-comparing alike — which is how a three-day $3.59 total was printed as the
   * seven-day $11.92 one under a header that said three days. A comparison is additive: it adds a
   * twin query over its own window and touches nothing else.
   */
  it('never widens the current window, not even for a one-day selection', () => {
    const oneDay = windowOf(1);
    const resolved = resolveDashboard({
      page: page([statPanel('a', { compare: true }), statPanel('b')]),
      window: oneDay,
      resetCadence: 'daily',
    });
    expect(resolved.window.start.toISOString()).toBe(oneDay.start.toISOString());
    expect(resolved.window.end.toISOString()).toBe(oneDay.end.toISOString());
    expect(resolved.window.end.getTime() - resolved.window.start.getTime()).toBe(DAY);

    // Both panels — the one that compares and the one that does not — query the picked day.
    const current = resolved.queries.filter(
      (query) => query.start_time === oneDay.start.toISOString()
    );
    expect(current).toHaveLength(1);
    expect(resolved.panels[0].queryIndex).toBe(resolved.panels[1].queryIndex);

    // …and the twin is the day BEFORE, of the same length, never overlapping.
    const twin = resolved.queries[resolved.panels[0].compareQueryIndex as number];
    expect(twin.end_time).toBe(oneDay.start.toISOString());
    expect(Date.parse(twin.end_time) - Date.parse(twin.start_time)).toBe(DAY);
  });

  it('leaves the page window untouched when no panel compares', () => {
    const oneDay = windowOf(1);
    const resolved = resolveDashboard({ page: page([statPanel('a')]), window: oneDay });
    expect(resolved.window.start.toISOString()).toBe(oneDay.start.toISOString());
  });
});

// ── converse-frontends#448: the lens, and list-valued filters ─────────────────────────────────
describe('the lens', () => {
  const lensPanel = (id: string, overrides: Partial<DashboardPageSpec['panels'][number]> = {}) =>
    statPanel(id, {
      query: { scope: 'all', group_by: ['user_id'], bucket: 'auto', limit: 100 },
      options: { lens: 'user' },
      ...overrides,
    });

  it('swaps the FIRST group_by dimension for the effective lens', () => {
    const resolved = resolveDashboard({
      page: page([lensPanel('a')], '/admin/usage'),
      window: windowOf(30),
      filters: { lens: 'project' },
    });
    expect(resolved.queries[0].group_by).toEqual(['project_id']);
    expect(resolved.panels[0].lens).toBe('project');
  });

  it('leaves every later dimension in place — those exist to widen the DEDUPE, not to be read', () => {
    const resolved = resolveDashboard({
      page: page(
        [
          lensPanel('a', {
            query: { scope: 'all', group_by: ['user_id', 'model'], bucket: 'auto', limit: 100 },
            options: { lens: 'user' },
          }),
        ],
        '/admin/usage'
      ),
      window: windowOf(30),
      filters: { lens: 'account' },
    });
    expect(resolved.queries[0].group_by).toEqual(['account_id', 'model']);
  });

  it('never duplicates a dimension the lens already introduced', () => {
    const resolved = resolveDashboard({
      page: page(
        [
          lensPanel('a', {
            query: {
              scope: 'all',
              group_by: ['user_id', 'account_id'],
              bucket: 'auto',
              limit: 100,
            },
            options: { lens: 'user' },
          }),
        ],
        '/admin/usage'
      ),
      window: windowOf(30),
      filters: { lens: 'account' },
    });
    expect(resolved.queries[0].group_by).toEqual(['account_id']);
  });

  it("falls back to the panel's own YAML default when the page sets no lens", () => {
    const resolved = resolveDashboard({
      page: page([lensPanel('a', { options: { lens: 'account' } })], '/admin/usage'),
      window: windowOf(30),
    });
    expect(resolved.queries[0].group_by).toEqual(['account_id']);
    expect(resolved.panels[0].lens).toBe('account');
  });

  /** A `?lens=` value is something a person can type. Unlike a `$param` placeholder — which has no
   *  honest fallback and therefore throws — every lens panel has its own default, so a nonsense
   *  value degrades to that rather than taking the page down. */
  it('ignores an unrecognised ?lens= rather than throwing', () => {
    const resolved = resolveDashboard({
      page: page([lensPanel('a')], '/admin/usage'),
      window: windowOf(30),
      filters: { lens: 'octopus' },
    });
    expect(resolved.queries[0].group_by).toEqual(['user_id']);
  });

  it('leaves a panel with no options.lens completely untouched by the knob', () => {
    const resolved = resolveDashboard({
      page: page(
        [
          statPanel('a', {
            query: { scope: 'all', group_by: ['model'], bucket: 'auto', limit: 1 },
          }),
        ],
        '/admin/usage'
      ),
      window: windowOf(30),
      filters: { lens: 'account' },
    });
    expect(resolved.queries[0].group_by).toEqual(['model']);
    expect(resolved.panels[0].lens).toBeUndefined();
  });

  it('substitutes $lens into the row link, so a row never says one thing and links to another', () => {
    const resolved = resolveDashboard({
      page: page(
        [
          lensPanel('a', {
            options: { lens: 'user', link: '/admin/usage/actors/:key?type=$lens' },
          }),
        ],
        '/admin/usage'
      ),
      window: windowOf(30),
      filters: { lens: 'project' },
    });
    expect(resolved.panels[0].link).toBe('/admin/usage/actors/:key?type=project');
  });
});

describe('list-valued filters (operation_in)', () => {
  const filtered = (operations: string[]) =>
    statPanel('a', {
      query: {
        scope: 'all',
        filters: { operation_in: operations },
        bucket: 'auto',
        limit: 100,
      },
    });

  it('passes the list through verbatim rather than substituting into it', () => {
    const resolved = resolveDashboard({
      page: page([filtered(['chat_completions', 'responses'])]),
      window: windowOf(30),
      filters: { lens: 'user' },
    });
    expect(resolved.queries[0].filters).toEqual({
      operation_in: ['chat_completions', 'responses'],
    });
  });

  it('treats a re-ordered list as the SAME question — one request, not two', () => {
    const resolved = resolveDashboard({
      page: page([
        filtered(['chat_completions', 'responses']),
        { ...filtered(['responses', 'chat_completions']), id: 'b' },
      ]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(1);
  });

  it('keeps a genuinely different list its own request', () => {
    const resolved = resolveDashboard({
      page: page([
        filtered(['chat_completions']),
        { ...filtered(['chat_completions', 'messages']), id: 'b' },
      ]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(2);
  });

  it('never shares a request with the same query UNFILTERED', () => {
    const resolved = resolveDashboard({
      page: page([
        statPanel('plain', { query: { scope: 'all', bucket: 'auto', limit: 100 } }),
        filtered(['chat_completions']),
      ]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(2);
    expect(queryKey(resolved.queries[0])).not.toBe(queryKey(resolved.queries[1]));
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

    // The three UNFILTERED ungrouped stats (total cost, total requests, avg cost per million
    // tokens) all point at the same request. `chat-completions-count` is ungrouped too but carries
    // an `operation_in` filter, so it is a different question and correctly stays its own request
    // — which is exactly what the dedupe key is supposed to distinguish.
    const ungrouped = resolved.panels.filter(
      (p) => !p.spec.query.group_by && !p.spec.query.filters
    );
    expect(ungrouped.length).toBeGreaterThan(1);
    expect(new Set(ungrouped.map((p) => p.queryIndex)).size).toBe(1);

    const chat = resolved.panels.find((p) => p.spec.id === 'chat-completions-count');
    expect(chat?.queryIndex).not.toBe(ungrouped[0].queryIndex);
  });
});

/**
 * C12 (converse-frontends#455) — the two resolver extensions the account and settings overview
 * pages needed, and the boundaries that keep them from becoming escape hatches.
 */
describe('optional filter placeholders', () => {
  const optionalPanel = (value: string) =>
    statPanel('a', {
      query: {
        scope: 'account',
        scope_id: '$accountId',
        filters: { project_id: value },
        limit: 10,
      },
    });

  it('drops the filter entirely when the page has no value for it', () => {
    const resolved = resolveDashboard({
      page: page([optionalPanel('$project?')]),
      window: windowOf(30),
      filters: { accountId: 'acct_1' },
    });
    // NOT `project_id: ''`, which matches nothing and would draw an empty dashboard for the
    // neutral "All projects" state of the picker.
    expect(resolved.queries[0].filters).toBeUndefined();
  });

  it('substitutes it like any other placeholder when the page does have one', () => {
    const resolved = resolveDashboard({
      page: page([optionalPanel('$project?')]),
      window: windowOf(30),
      filters: { accountId: 'acct_1', project: 'proj_7' },
    });
    expect(resolved.queries[0].filters).toEqual({ project_id: 'proj_7' });
  });

  it('still refuses a REQUIRED placeholder the page did not supply', () => {
    expect(() =>
      resolveDashboard({
        page: page([optionalPanel('$project')]),
        window: windowOf(30),
        filters: { accountId: 'acct_1' },
      })
    ).toThrow(/Unresolved dashboard placeholder "\$project"/);
  });

  /** Dropping a scope does not widen a query, it changes what the query is ABOUT — so the optional
   *  form is refused outside `filters`, loudly, rather than silently resolving to the estate. */
  it('refuses the optional form on scope_id', () => {
    const bad = statPanel('a', {
      query: { scope: 'account', scope_id: '$accountId?', limit: 10 },
    });
    expect(() =>
      resolveDashboard({ page: page([bad]), window: windowOf(30), filters: {} })
    ).toThrow(/legal only inside `filters/);
  });

  it('changes the dedupe key, so a filtered and an unfiltered panel are two requests', () => {
    const resolved = resolveDashboard({
      page: page([
        optionalPanel('$project?'),
        statPanel('b', { query: { scope: 'account', scope_id: '$accountId', limit: 10 } }),
      ]),
      window: windowOf(30),
      filters: { accountId: 'acct_1', project: 'proj_7' },
    });
    expect(resolved.queries).toHaveLength(2);
  });
});

describe('scope: family', () => {
  const familyPanel = (id: string, overrides: Partial<DashboardPageSpec['panels'][number]> = {}) =>
    statPanel(id, {
      query: { scope: 'family', group_by: ['account_id', 'model'], bucket: 'auto', limit: 2000 },
      ...overrides,
    });

  it('expands into one account-scoped query per family account, in order', () => {
    const resolved = resolveDashboard({
      page: page([familyPanel('a')]),
      window: windowOf(30),
      familyAccountIds: ['acct_1', 'acct_2', 'acct_3'],
    });

    expect(resolved.queries).toHaveLength(3);
    expect(resolved.queries.map((q) => q.scope)).toEqual(['account', 'account', 'account']);
    expect(resolved.queries.map((q) => q.scope_id)).toEqual(['acct_1', 'acct_2', 'acct_3']);
    expect(resolved.panels[0].queryIndices).toEqual([0, 1, 2]);
  });

  /** `family` is a RESOLVER concept — it must never reach the wire, where it is not a
   *  `UsageScope` and would be a 400 on every panel. */
  it('never leaves a family scope in the resolved query list', () => {
    const resolved = resolveDashboard({
      page: page([familyPanel('a')]),
      window: windowOf(30),
      familyAccountIds: ['acct_1'],
    });
    expect(resolved.queries.some((q) => q.scope === 'family')).toBe(false);
  });

  /** The whole point of putting the fan-out behind the dedupe: two family panels sharing a query
   *  shape share the fan-out, rather than each costing N requests. */
  it('deduplicates the fan-out across panels', () => {
    const resolved = resolveDashboard({
      page: page([familyPanel('a'), familyPanel('b'), familyPanel('c')]),
      window: windowOf(30),
      familyAccountIds: ['acct_1', 'acct_2'],
    });
    expect(resolved.queries).toHaveLength(2);
    expect(resolved.panels.map((p) => p.queryIndices)).toEqual([
      [0, 1],
      [0, 1],
      [0, 1],
    ]);
  });

  it('fans the comparison twin out too, so both sides cover the same accounts', () => {
    const resolved = resolveDashboard({
      page: page([familyPanel('a', { compare: true })]),
      window: windowOf(30),
      familyAccountIds: ['acct_1', 'acct_2'],
    });
    expect(resolved.queries).toHaveLength(4);
    expect(resolved.panels[0].compareQueryIndices).toEqual([2, 3]);
    expect(resolved.queries.slice(2).map((q) => q.scope_id)).toEqual(['acct_1', 'acct_2']);
  });

  /** A session whose family has not loaded yet is transient and real — it reads as an empty
   *  dashboard, never as a throw or a permanently-pending panel. */
  it('resolves to zero queries for an empty family rather than throwing', () => {
    const resolved = resolveDashboard({ page: page([familyPanel('a')]), window: windowOf(30) });
    expect(resolved.queries).toEqual([]);
    expect(resolved.panels[0].queryIndices).toEqual([]);
    expect(resolved.panels[0].queryIndex).toBeUndefined();
  });

  it('leaves an ordinary panel on a family page as a single query', () => {
    const resolved = resolveDashboard({
      page: page([familyPanel('a'), statPanel('b')]),
      window: windowOf(30),
      familyAccountIds: ['acct_1', 'acct_2'],
    });
    expect(resolved.panels[1].queryIndices).toHaveLength(1);
    expect(resolved.queries[resolved.panels[1].queryIndex as number].scope).toBe('all');
  });
});

// ── Story C6 (converse-frontends#449): a substituted `scope` is CHECKED, not passed through ──

describe('substituting a scope from a page filter', () => {
  const actorPanel = statPanel('actor-total-cost', {
    query: { scope: '$type', scope_id: '$actorId', bucket: 'auto', limit: 2000 },
  });

  it.each(['user', 'account', 'project', 'all', 'api_key'])(
    'accepts %s — every member of the backend’s own scope enum',
    (type) => {
      const resolved = resolveDashboard({
        page: page([actorPanel]),
        window: windowOf(30),
        filters: { type, actorId: 'act_1' },
      });
      expect(resolved.queries[0].scope).toBe(type);
      expect(resolved.queries[0].scope_id).toBe('act_1');
    }
  );

  /**
   * The failure this exists to prevent: a `?type=` a person typed reaching the usage backend as a
   * malformed scope, whose 400 would arrive under a page that has already printed an actor's name
   * above it — and which, on the day the enum grows, would silently ask a question the page never
   * meant to ask.
   */
  it.each(['everything', 'account ', 'Account', 'accounts', '../etc'])(
    'REFUSES %s, naming the page and the panel',
    (type) => {
      expect(() =>
        resolveDashboard({
          page: page([actorPanel], '/admin/usage/actors/[actorId]'),
          window: windowOf(30),
          filters: { type, actorId: 'act_1' },
        })
      ).toThrow(
        /Invalid usage scope .* on page "\/admin\/usage\/actors\/\[actorId\]", panel "actor-total-cost"/
      );
    }
  );

  /** A LITERAL scope in the YAML goes through the same check — the schema types it as a plain
   *  string so a page can be authored before a column lands, and this is the one field where that
   *  freedom would be a bug rather than a feature. */
  it('refuses a literal scope the enum does not know', () => {
    expect(() =>
      resolveDashboard({
        page: page([statPanel('p', { query: { scope: 'estate', bucket: 'auto', limit: 10 } })]),
        window: windowOf(30),
      })
    ).toThrow(/Invalid usage scope "estate"/);
  });

  it('still refuses an ABSENT type before it can become an empty scope', () => {
    expect(() =>
      resolveDashboard({
        page: page([actorPanel]),
        window: windowOf(30),
        filters: { actorId: 'act_1' },
      })
    ).toThrow(/Unresolved dashboard placeholder "\$type"/);
  });
});

describe('a list filter (operation_in) through resolution', () => {
  const chatPanel = statPanel('chat', {
    query: {
      scope: 'all',
      filters: { operation_in: ['chat_completions', 'responses', 'messages'] },
      bucket: 'auto',
      limit: 2000,
    },
  });

  it('survives as a LIST — never joined into a string, never substituted into', () => {
    const resolved = resolveDashboard({
      page: page([chatPanel]),
      window: windowOf(30),
      filters: { type: 'user' },
    });
    expect(resolved.queries[0].filters?.operation_in).toEqual([
      'chat_completions',
      'responses',
      'messages',
    ]);
  });

  /** The dedupe key sorts list members, so two panels asking the same three-valued question in a
   *  different order share ONE request rather than firing two identical ones. */
  it('shares one request with a panel that listed the same operations in another order', () => {
    const reordered = statPanel('chat-2', {
      query: {
        scope: 'all',
        filters: { operation_in: ['messages', 'chat_completions', 'responses'] },
        bucket: 'auto',
        limit: 2000,
      },
    });
    const resolved = resolveDashboard({ page: page([chatPanel, reordered]), window: windowOf(30) });
    expect(resolved.queries).toHaveLength(1);
  });

  it('is a DIFFERENT question from the same query unfiltered', () => {
    const unfiltered = statPanel('total');
    const resolved = resolveDashboard({
      page: page([chatPanel, unfiltered]),
      window: windowOf(30),
    });
    expect(resolved.queries).toHaveLength(2);
    expect(queryKey(resolved.queries[0])).not.toBe(queryKey(resolved.queries[1]));
  });
});
