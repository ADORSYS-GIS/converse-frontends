import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { parse as parseYaml } from 'yaml';

import { FAMILY_SCOPE, findPage, parseDashboardsFile, usageScopes } from './dashboard-spec';
import type { DashboardPageSpec, DashboardsFile } from './dashboard-spec';
import { toPanelView } from './panel-adapters';
import { resolveDashboard } from './resolve-dashboard';
import {
  ADMIN_USAGE_ACTOR_ROUTE,
  ADMIN_USAGE_CHANNEL_ROUTE,
  ADMIN_USAGE_CHATS_ROUTE,
  ADMIN_USAGE_MODEL_ROUTE,
} from './usage-routes';
import { englishT } from '../test/english-t';
import { translateDashboardPage } from './page-entry';

/**
 * ADR 0017: `dashboards.yaml` carries i18n KEYS for `title`/`subtitle`/`rowLabel`/`unit`, and the
 * engine resolves them per request. These assertions are about the COPY a reader sees, so they run
 * the same resolver the server does, bound to English — which makes each of them a check on two
 * things at once: that the panel still says what it used to say, and that its key still exists in
 * `locales/en/dashboards.json`.
 */
const T = englishT('dashboards');

/**
 * The four `/admin/usage` drill-down entries (converse-frontends#449, story C6; the model page
 * added by the owner's 2026-09-03 feedback on that issue).
 *
 * These pages have no per-panel query code anywhere in `apps/console`, so this file is where their
 * CONTRACT lives — the same job `admin-usage-page.test.ts` does for the estate page. Four things
 * it pins, each of which could otherwise rot silently:
 *
 *  - **The panel ids, in order.** C10's report renderer walks them and C11 documents them; a
 *    rename must be a failing test rather than a quiet break in two other slices.
 *  - **The placeholders.** `scope: $type` / `scope_id: $actorId` on every actor panel and
 *    `filters.azp: $channelId` on every channel panel — plus the ERROR case, because an
 *    unresolved placeholder silently substituting an empty string would query the whole estate
 *    under one actor's title.
 *  - **`operation_in` in ONE query per panel**, never three client-side queries unioned.
 *  - **The dedupe**, checked by resolving the real entries rather than asserted in a comment.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');

function dashboards(): DashboardsFile {
  return parseDashboardsFile(parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')), REPO_DASHBOARDS);
}

function pageAt(route: string): DashboardPageSpec {
  const page = findPage(dashboards(), route);
  if (!page) throw new Error(`dashboards.yaml has no "${route}" entry`);
  return translateDashboardPage(page, T);
}

const CHAT_OPERATIONS = ['chat_completions', 'responses', 'messages'];

/** A 30-day window, so these assertions are about the SPEC rather than about calendar
 *  arithmetic. */
const WINDOW = {
  start: new Date('2026-08-01T00:00:00.000Z'),
  end: new Date('2026-08-29T00:00:00.000Z'),
};

// ── /admin/usage/actors/[actorId] ────────────────────────────────────────────────────────────

describe('/admin/usage/actors/[actorId] in dashboards.yaml', () => {
  const actors = () => pageAt(ADMIN_USAGE_ACTOR_ROUTE);

  it('declares exactly the nine contracted panel ids, in order', () => {
    expect(actors().panels.map((panel) => panel.id)).toEqual([
      'actor-total-cost',
      'actor-total-requests',
      'actor-cost-by-model',
      'actor-cost-by-channel',
      'actor-model-cost-share',
      'actor-chat-completions-count',
      'actor-model-distribution-requests',
      'actor-model-distribution-cost',
      'actor-model-distribution-tokens',
    ]);
  });

  it('owns the two route params the placeholders need, and only those', () => {
    expect(actors().filters).toEqual(['actorId', 'type']);
  });

  it('scopes EVERY panel to the actor — never the estate under an actor’s title', () => {
    for (const panel of actors().panels) {
      expect(panel.query.scope, panel.id).toBe('$type');
      expect(panel.query.scope_id, panel.id).toBe('$actorId');
      expect(panel.query.limit, panel.id).toBeGreaterThan(0);
    }
  });

  it('introduces no panel type of its own — every one is a shape C5 already draws', () => {
    expect([...new Set(actors().panels.map((panel) => panel.type))].sort()).toEqual([
      'donut',
      'ranked',
      'series',
      'share',
      'stat',
    ]);
  });

  it('keeps the rings at three and the share bar at one (ADR 0013 D5, as amended)', () => {
    const types = actors().panels.map((panel) => panel.type);
    expect(types.filter((type) => type === 'donut')).toHaveLength(3);
    expect(types.filter((type) => type === 'share')).toHaveLength(1);
  });

  it('reads all three metrics off the three rings — requests, cost and tokens', () => {
    const metricOf = (id: string) => actors().panels.find((panel) => panel.id === id)?.metric;
    expect(metricOf('actor-model-distribution-requests')).toBe('requests');
    expect(metricOf('actor-model-distribution-cost')).toBe('cost');
    expect(metricOf('actor-model-distribution-tokens')).toBe('tokens');
  });

  it('compares exactly the two headline totals against the previous window', () => {
    expect(
      actors()
        .panels.filter((panel) => panel.compare)
        .map((panel) => panel.id)
    ).toEqual(['actor-total-cost', 'actor-total-requests']);
  });

  it('continues the drill path — channel rows are real anchors, not dead ends', () => {
    const channel = actors().panels.find((panel) => panel.id === 'actor-cost-by-channel');
    expect(channel?.query.group_by).toEqual(['azp']);
    expect(channel?.options?.link).toBe('/admin/usage/channels/:key');
  });

  it('asks the three chat surfaces in ONE query via operation_in, not three', () => {
    const panel = actors().panels.find((panel) => panel.id === 'actor-chat-completions-count');
    expect(panel?.metric).toBe('derived:chatCount');
    expect(panel?.query.filters?.operation_in).toEqual(CHAT_OPERATIONS);
  });

  it('resolves nine panels to five requests under every actor type', () => {
    for (const type of ['user', 'account', 'project']) {
      const resolved = resolveDashboard({
        page: actors(),
        window: WINDOW,
        filters: { actorId: 'act_1', type },
      });
      expect(resolved.queries, type).toHaveLength(5);
      for (const query of resolved.queries) {
        expect(query.scope, type).toBe(type);
        expect(query.scope_id, type).toBe('act_1');
      }
    }
  });

  it('shares one request across the model-grained panels and one twin across both totals', () => {
    const resolved = resolveDashboard({
      page: actors(),
      window: WINDOW,
      filters: { actorId: 'act_1', type: 'account' },
    });
    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;

    expect(indexOf('actor-total-cost')).toBe(indexOf('actor-total-requests'));

    const modelGrained = [
      'actor-cost-by-model',
      'actor-model-cost-share',
      'actor-model-distribution-requests',
      'actor-model-distribution-cost',
      'actor-model-distribution-tokens',
    ].map(indexOf);
    expect(new Set(modelGrained).size).toBe(1);

    // The chat-filtered query is its OWN request — a filtered query is a different question.
    expect(indexOf('actor-chat-completions-count')).not.toBe(indexOf('actor-total-cost'));

    const comparing = resolved.panels.filter((panel) => panel.compareQueryIndex !== undefined);
    expect(comparing.map((panel) => panel.spec.id)).toEqual([
      'actor-total-cost',
      'actor-total-requests',
    ]);
    expect(comparing[0].compareQueryIndex).toBe(comparing[1].compareQueryIndex);
  });

  // ── The negative cases. Each is an explicit AC. ──────────────────────────────────────────
  it('REFUSES to resolve when a placeholder has no value — never an empty substitution', () => {
    expect(() =>
      resolveDashboard({ page: actors(), window: WINDOW, filters: { type: 'user' } })
    ).toThrow(/Unresolved dashboard placeholder "\$actorId"/);
    expect(() =>
      resolveDashboard({ page: actors(), window: WINDOW, filters: { actorId: 'act_1' } })
    ).toThrow(/Unresolved dashboard placeholder "\$type"/);
    // An EMPTY value is the same failure as an absent one, and for the same reason.
    expect(() =>
      resolveDashboard({ page: actors(), window: WINDOW, filters: { actorId: '', type: 'user' } })
    ).toThrow(/Unresolved dashboard placeholder "\$actorId"/);
  });

  it('REFUSES a ?type= outside the closed usage-scope enum', () => {
    expect(() =>
      resolveDashboard({
        page: actors(),
        window: WINDOW,
        filters: { actorId: 'act_1', type: 'everything' },
      })
    ).toThrow(/Invalid usage scope "everything"/);
  });
});

// ── /admin/usage/channels/[channelId] ────────────────────────────────────────────────────────

describe('/admin/usage/channels/[channelId] in dashboards.yaml', () => {
  const channels = () => pageAt(ADMIN_USAGE_CHANNEL_ROUTE);

  it('declares exactly the seven contracted panel ids, in order', () => {
    expect(channels().panels.map((panel) => panel.id)).toEqual([
      'channel-total-cost',
      'channel-total-requests',
      'channel-cost-by-model',
      'channel-model-cost-share',
      'channel-chat-completions-count',
      'channel-actors',
      'channel-requests-by-operation',
    ]);
  });

  it('owns exactly its one route param', () => {
    expect(channels().filters).toEqual(['channelId']);
  });

  it('is an ESTATE query narrowed by azp — a channel is not a usage scope', () => {
    for (const panel of channels().panels) {
      expect(panel.query.scope, panel.id).toBe('all');
      expect(panel.query.scope_id, panel.id).toBeUndefined();
      expect(panel.query.filters?.azp, panel.id).toBe('$channelId');
    }
  });

  it('links its actor rows back with the matching ?type=user', () => {
    const actorsPanel = channels().panels.find((panel) => panel.id === 'channel-actors');
    expect(actorsPanel?.query.group_by).toEqual(['user_id']);
    expect(actorsPanel?.options?.link).toBe('/admin/usage/actors/:key?type=user');
    // NOT lens-driven: this page has no lens knob, so a `$lens` here would never be substituted.
    expect(actorsPanel?.options?.lens).toBeUndefined();
  });

  it('breaks requests down by A3’s operation dimension', () => {
    const byOperation = channels().panels.find(
      (panel) => panel.id === 'channel-requests-by-operation'
    );
    expect(byOperation?.type).toBe('ranked');
    expect(byOperation?.metric).toBe('requests');
    expect(byOperation?.query.group_by).toEqual(['operation']);
  });

  it('resolves seven panels to six requests, the channel filter on every one', () => {
    const resolved = resolveDashboard({
      page: channels(),
      window: WINDOW,
      filters: { channelId: 'opencode-cli' },
    });
    expect(resolved.queries).toHaveLength(6);
    for (const query of resolved.queries) {
      expect(query.filters?.azp).toBe('opencode-cli');
    }

    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;
    expect(indexOf('channel-total-cost')).toBe(indexOf('channel-total-requests'));
    expect(indexOf('channel-cost-by-model')).toBe(indexOf('channel-model-cost-share'));
  });

  it('REFUSES to resolve without its channel id', () => {
    expect(() => resolveDashboard({ page: channels(), window: WINDOW })).toThrow(
      /Unresolved dashboard placeholder "\$channelId"/
    );
  });
});

// ── /admin/usage/models/[model] ──────────────────────────────────────────────────────────────

describe('/admin/usage/models/[model] in dashboards.yaml', () => {
  const models = () => pageAt(ADMIN_USAGE_MODEL_ROUTE);

  it('declares exactly the eight contracted panel ids, in order', () => {
    expect(models().panels.map((panel) => panel.id)).toEqual([
      'model-total-cost',
      'model-total-requests',
      'model-total-tokens',
      'model-cost-over-time',
      'model-actors',
      'model-channels',
      'model-latency',
      'model-requests-by-operation',
    ]);
  });

  it('owns exactly its one route param', () => {
    expect(models().filters).toEqual(['model']);
  });

  it('is an ESTATE query narrowed by model — a model is not a usage scope', () => {
    for (const panel of models().panels) {
      expect(panel.query.scope, panel.id).toBe('all');
      expect(panel.query.scope_id, panel.id).toBeUndefined();
      expect(panel.query.filters?.model, panel.id).toBe('$model');
    }
  });

  it('sets an explicit limit on every panel — never a server default', () => {
    for (const panel of models().panels) {
      expect(panel.query.limit, panel.id).toBeGreaterThan(0);
    }
  });

  /** THREE compared totals, not the estate page's two: a model is the one subject where the token
   *  count is a headline reading — it is what the price is charged on. */
  it('compares all three headline totals against the previous window', () => {
    expect(
      models()
        .panels.filter((panel) => panel.compare)
        .map((panel) => panel.id)
    ).toEqual(['model-total-cost', 'model-total-requests', 'model-total-tokens']);
    expect(models().panels.find((p) => p.id === 'model-total-tokens')?.metric).toBe('tokens');
  });

  it('continues the drill path into actors and channels rather than dead-ending', () => {
    const actorsPanel = models().panels.find((panel) => panel.id === 'model-actors');
    expect(actorsPanel?.query.group_by).toEqual(['user_id']);
    expect(actorsPanel?.options?.link).toBe('/admin/usage/actors/:key?type=user');
    // NOT lens-driven: this page has no lens knob, so a `$lens` here would never be substituted.
    expect(actorsPanel?.options?.lens).toBeUndefined();

    const channelsPanel = models().panels.find((panel) => panel.id === 'model-channels');
    expect(channelsPanel?.query.group_by).toEqual(['azp']);
    expect(channelsPanel?.options?.link).toBe('/admin/usage/channels/:key');
  });

  it('carries the latency cards at full width, off the same filtered query', () => {
    const latency = models().panels.find((panel) => panel.id === 'model-latency');
    expect(latency?.type).toBe('latency-cards');
    expect(latency?.span).toBe(2);
    expect(latency?.metric).toBe('latency');
    expect(latency?.query.group_by).toEqual(['model']);
  });

  /** LINES, never a stack: the 2026-09-03 ruling that lifted D5's stacked-bar ban was for daily
   *  spend × model, where the bar height states a total the lines cannot. One model has nothing to
   *  stack. */
  it('draws its cost board as lines, not a single-series stack', () => {
    const series = models().panels.find((panel) => panel.id === 'model-cost-over-time');
    expect(series?.type).toBe('series');
    expect(series?.options?.style).toBeUndefined();
  });

  it('resolves eight panels to six requests, the model filter on every one', () => {
    const resolved = resolveDashboard({
      page: models(),
      window: WINDOW,
      filters: { model: 'gpt-4o' },
    });
    expect(models().panels).toHaveLength(8);
    expect(resolved.queries).toHaveLength(6);
    for (const query of resolved.queries) {
      expect(query.filters?.model).toBe('gpt-4o');
    }

    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;
    // All three totals share the one ungrouped request…
    expect(indexOf('model-total-cost')).toBe(indexOf('model-total-requests'));
    expect(indexOf('model-total-cost')).toBe(indexOf('model-total-tokens'));
    // …and share ONE comparison twin between them, not one each.
    const comparing = resolved.panels.filter((panel) => panel.compareQueryIndex !== undefined);
    expect(comparing).toHaveLength(3);
    expect(new Set(comparing.map((p) => p.compareQueryIndex)).size).toBe(1);
    // The series and the latency cards read the same `[model]` grouping from different columns.
    expect(indexOf('model-cost-over-time')).toBe(indexOf('model-latency'));
  });

  it('REFUSES to resolve without its model', () => {
    expect(() => resolveDashboard({ page: models(), window: WINDOW })).toThrow(
      /Unresolved dashboard placeholder "\$model"/
    );
  });
});

// ── /admin/usage/chats ───────────────────────────────────────────────────────────────────────

describe('/admin/usage/chats in dashboards.yaml', () => {
  const chats = () => pageAt(ADMIN_USAGE_CHATS_ROUTE);

  it('declares exactly the five contracted panel ids, in order', () => {
    expect(chats().panels.map((panel) => panel.id)).toEqual([
      'chat-latency-series',
      'chat-latency-cards',
      'chat-total-count',
      'chat-requests-by-operation',
      'chat-cost-by-model',
    ]);
  });

  it('owns no filter of its own — the chat narrowing is the YAML’s, not a knob', () => {
    expect(chats().filters).toEqual([]);
  });

  it('puts operation_in on EVERY panel — one query each, never three unioned in the browser', () => {
    for (const panel of chats().panels) {
      expect(panel.query.filters?.operation_in, panel.id).toEqual(CHAT_OPERATIONS);
      expect(panel.query.scope, panel.id).toBe('all');
    }
  });

  it('carries the honest latency pair: a per-bucket series and the window’s cards', () => {
    const series = chats().panels.find((panel) => panel.id === 'chat-latency-series');
    expect(series?.type).toBe('latency-series');
    expect(series?.metric).toBe('latency');
    // UNGROUPED — the two lines are the two PERCENTILES, not two models. A `group_by` here would
    // silently turn the panel into one p50 line per model and drop p95 entirely.
    expect(series?.query.group_by).toBeUndefined();
    // …and the reason it is honest at all, stated where a reader of the page will see it.
    expect(series?.subtitle).toMatch(/per bucket/i);
    expect(series?.subtitle).toMatch(/never an average of percentiles/i);

    const cards = chats().panels.find((panel) => panel.id === 'chat-latency-cards');
    expect(cards?.type).toBe('latency-cards');
    expect(cards?.query.group_by).toEqual(['model']);
    expect(cards?.subtitle).toMatch(/WORST bucket/);
  });

  it('counts chats with a plain metric so the total can carry an honest delta', () => {
    const total = chats().panels.find((panel) => panel.id === 'chat-total-count');
    // Every query on this page is already filtered to the three chat surfaces, so a request IS a
    // chat request — and unlike `derived:chatCount`, a base metric compares.
    expect(total?.metric).toBe('requests');
    expect(total?.compare).toBe(true);
  });

  it('resolves five panels to four requests', () => {
    const resolved = resolveDashboard({ page: chats(), window: WINDOW });
    expect(resolved.queries).toHaveLength(4);

    const indexOf = (id: string) => resolved.panels.find((p) => p.spec.id === id)?.queryIndex;
    // The ungrouped chat query serves both the latency series and the count…
    expect(indexOf('chat-latency-series')).toBe(indexOf('chat-total-count'));
    // …and the model-grained one serves the cards and the cost board.
    expect(indexOf('chat-latency-cards')).toBe(indexOf('chat-cost-by-model'));
    // The list filter survives resolution as a LIST, not a joined string.
    for (const query of resolved.queries) {
      expect(query.filters?.operation_in).toEqual(CHAT_OPERATIONS);
    }
  });
});

// ── The 2026-09-03 spend-inflation regression ────────────────────────────────────────────────

/**
 * `/admin/usage/actors/2ae81c83-…?type=account&from=2026-09-01&to=2026-09-03` printed **$11.92**
 * in `actor-total-cost` while the account's own ledger — and the "Budget & next reset" zone
 * beside it — said **$3.59** (converse-frontends#448).
 *
 * The read-only check against the prod usage replica gave the account's daily totals below. Their
 * sum over 28 Aug – 3 Sep is $11.92 to the cent, and over 1–3 Sep is $3.59: the page was querying
 * a SEVEN-day window under a header that said three days, because `comparisonWindow`'s one-week
 * floor widened the CURRENT window and `resolveDashboard` handed that widened window to every
 * panel — the comparing ones and their neighbours alike.
 *
 * This test is the incident, end to end and in its own numbers: the resolved window, the stat the
 * shared adapter builds from it, and the delta naming the window it actually compared against.
 */
const INCIDENT_DAILY_MICRO_USD: Record<string, number> = {
  '2026-08-28': 2_740_000,
  '2026-08-29': 80_000,
  '2026-08-30': 0,
  '2026-08-31': 5_510_000,
  '2026-09-01': 1_390_000,
  '2026-09-02': 2_200_000,
  '2026-09-03': 0,
};

function dailyPoint(day: string, microUsd: number): UsageSeriesPoint {
  return {
    bucket_start: `${day}T00:00:00.000Z`,
    completion_tokens: 0,
    latency_samples: 0,
    prompt_tokens: 0,
    requests: 0,
    total_cost: microUsd,
    total_tokens: 0,
    usage_value: 0,
  };
}

/** The replica's rows for one window — what the usage backend would answer for that query. */
function ledger(startIso: string, endIso: string): UsageQueryResponse {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  return {
    truncated: false,
    points: Object.entries(INCIDENT_DAILY_MICRO_USD)
      .filter(([day]) => {
        const at = Date.parse(`${day}T00:00:00.000Z`);
        return at >= start && at <= end;
      })
      .map(([day, microUsd]) => dailyPoint(day, microUsd)),
  };
}

describe('the 2026-09-03 actor-total-cost inflation', () => {
  // Exactly what `resolveOverviewWindow('mtd', '2026-09-01', '2026-09-03', …)` produces: the `to`
  // day is INCLUSIVE, so the window runs to the last millisecond of 3 September.
  const PICKED = {
    start: new Date('2026-09-01T00:00:00.000Z'),
    end: new Date('2026-09-03T23:59:59.999Z'),
  };

  const resolve = () =>
    resolveDashboard({
      page: pageAt(ADMIN_USAGE_ACTOR_ROUTE),
      window: PICKED,
      filters: { actorId: '2ae81c83-b75b-41ee-98d0-8791af1560e9', type: 'account' },
      // The account's own effective cadence. The current window is not a cadence's business, so
      // every cadence must behave identically here.
      resetCadence: 'monthly',
    });

  it('queries the picked three days, never a widened week', () => {
    const resolved = resolve();
    const totalCost = resolved.panels.find((panel) => panel.spec.id === 'actor-total-cost');
    const query = resolved.queries[totalCost!.queryIndex!];

    expect(query.start_time).toBe('2026-09-01T00:00:00.000Z');
    expect(query.end_time).toBe('2026-09-03T23:59:59.999Z');
    // The bug, stated as the thing that must not happen again: 28 August was never in the picker.
    expect(Date.parse(query.start_time)).toBeGreaterThan(Date.parse('2026-08-28T00:00:00.000Z'));
    expect(resolved.window.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('moves NO panel’s window — not the comparing one, not its neighbours', () => {
    const resolved = resolve();
    for (const panel of resolved.panels) {
      for (const index of panel.queryIndices) {
        expect(resolved.queries[index].start_time, panel.spec.id).toBe('2026-09-01T00:00:00.000Z');
        expect(resolved.queries[index].end_time, panel.spec.id).toBe('2026-09-03T23:59:59.999Z');
      }
    }
  });

  it('states $3.59, not $11.92, through the same adapter the page renders with', () => {
    const resolved = resolve();
    const panel = resolved.panels.find((entry) => entry.spec.id === 'actor-total-cost')!;
    const query = resolved.queries[panel.queryIndex!];
    const twin = resolved.queries[panel.compareQueryIndex!];

    // The seven-day sum the page used to print, kept here so the fixture is checkable against the
    // incident: a real total of real rows — just not the ones the picker asked for.
    const widened = ledger('2026-08-28T00:00:00.000Z', '2026-09-03T23:59:59.999Z');
    expect(
      widened.points.reduce((sum, entry) => sum + entry.total_cost, 0) / 1_000_000
    ).toBeCloseTo(11.92, 10);

    const view = toPanelView({
      spec: panel.spec,
      response: ledger(query.start_time, query.end_time),
      compareResponse: ledger(twin.start_time, twin.end_time),
      compareWindow: panel.compareWindow,
      scale: 'linear',
      onScaleChange: () => undefined,
      groupBy: query.group_by,
    });

    expect(view).toMatchObject({ kind: 'stat', metric: '$3.59' });
    // A calendar-month shift of 1–3 Sep is 1–3 Aug, which this account had no usage in at all —
    // and a percentage off a zero base is not a number.
    expect(view.kind === 'stat' && view.delta?.label).toBe('new this period');
  });

  it('compares against an equally long window that never overlaps the current one', () => {
    const resolved = resolve();
    const panel = resolved.panels.find((entry) => entry.spec.id === 'actor-total-cost')!;
    const twin = resolved.queries[panel.compareQueryIndex!];
    const current = resolved.queries[panel.queryIndex!];

    expect(Date.parse(twin.end_time) - Date.parse(twin.start_time)).toBe(
      Date.parse(current.end_time) - Date.parse(current.start_time)
    );
    expect(Date.parse(twin.end_time)).toBeLessThanOrEqual(PICKED.start.getTime());
  });

  /** A daily-resetting account's window is not widened either — the floor is gone for every
   *  cadence, not just the monthly default. */
  it('leaves a daily-cadence account’s three days alone too', () => {
    const resolved = resolveDashboard({
      page: pageAt(ADMIN_USAGE_ACTOR_ROUTE),
      window: PICKED,
      filters: { actorId: '2ae81c83-b75b-41ee-98d0-8791af1560e9', type: 'account' },
      resetCadence: 'daily',
    });
    const panel = resolved.panels.find((entry) => entry.spec.id === 'actor-total-cost')!;
    expect(resolved.queries[panel.queryIndex!].start_time).toBe('2026-09-01T00:00:00.000Z');
    // 29 Aug 00:00:00.001 – 1 Sep 00:00:00.000: the same three days, immediately before.
    expect(resolved.queries[panel.compareQueryIndex!].end_time).toBe('2026-09-01T00:00:00.000Z');
  });
});

// ── Cross-page invariants ────────────────────────────────────────────────────────────────────

describe('every page in dashboards.yaml', () => {
  it('names a scope the resolver knows, or a placeholder resolved into one', () => {
    // `family` is the resolver's own extension (C12) and never reaches the wire — `expandFamily`
    // turns it into one `account`-scoped query per family account first.
    const resolvable: readonly string[] = [...usageScopes, FAMILY_SCOPE];
    for (const page of dashboards().pages) {
      for (const panel of page.panels) {
        const scope = panel.query.scope;
        if (scope === undefined || scope.startsWith('$')) continue;
        expect(resolvable, `${page.route} / ${panel.id}`).toContain(scope);
      }
    }
  });

  it('gives every panel a unique id within its page and an explicit limit', () => {
    for (const page of dashboards().pages) {
      const ids = page.panels.map((panel) => panel.id);
      expect(new Set(ids).size, page.route).toBe(ids.length);
      for (const panel of page.panels) {
        expect(panel.query.limit, `${page.route} / ${panel.id}`).toBeGreaterThan(0);
      }
    }
  });
});
