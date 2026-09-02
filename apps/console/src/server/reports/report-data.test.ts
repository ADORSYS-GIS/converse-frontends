import { describe, expect, it } from 'vitest';
import type { UsageQueryResponse } from '@lightbridge/api-rest';

import { findPage } from '../../dashboards/dashboard-spec';
import { loadDashboards } from '../../dashboards/load-dashboards';
import { resolveDashboard, type ResolvedDashboard } from '../../dashboards/resolve-dashboard';
import { buildReport } from './report-data';
import { reportCsv } from './report-csv';
import { reportHtml } from './report-html';

/**
 * The assembly step: a resolved dashboard plus its responses become `data.json` and the chart
 * assets.
 *
 * Runs in the `node` project, with NO DOM at all, even though it renders React: that is the point.
 * The export route runs in Next's node runtime, so a chart that only draws once mounted would pass
 * a jsdom test and produce an empty box in the PDF. `renderToStaticMarkup` fires no effect and
 * touches no `document`, and this test is where that is proven for the assembled report.
 */

const WINDOW = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-09-14T00:00:00Z') };

function point(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    requests: 10,
    usage_value: 0,
    total_cost: 2_000_000,
    prompt_tokens: 100,
    completion_tokens: 100,
    total_tokens: 200,
    latency_samples: 5,
    latency_p50_ms: 100,
    latency_p95_ms: 200,
    latency_p99_ms: 300,
    ...overrides,
  };
}

function response(points: Record<string, unknown>[]): UsageQueryResponse {
  return { points } as unknown as UsageQueryResponse;
}

type MakeResponses = (resolved: ResolvedDashboard) => (UsageQueryResponse | null)[];

/** Every query answers with the same two-model, two-actor window. */
const WITH_DATA: MakeResponses = (resolved) =>
  resolved.queries.map(() =>
    response([
      point({ model: 'gpt-4o', user_id: 'usr_a' }),
      point({
        model: 'claude-sonnet',
        user_id: 'usr_b',
        total_cost: 500_000,
        bucket_start: '2026-09-02T00:00:00Z',
      }),
    ])
  );

/** Every query failed. */
const ALL_FAILED: MakeResponses = (resolved) => resolved.queries.map(() => null);

function build(makeResponses: MakeResponses, includeTables = true) {
  const page = findPage(loadDashboards(), '/admin/usage');
  if (!page) throw new Error('fixture page missing from dashboards.yaml');
  const resolved = resolveDashboard({ page, window: WINDOW, filters: { lens: 'user' } });
  return {
    page,
    resolved,
    built: buildReport({
      resolved,
      responses: makeResponses(resolved),
      title: 'Admin · Usage',
      rangeLabel: 'This month',
      filters: [{ label: 'lens', value: 'user' }],
      template: { route: '/admin/usage', origin: 'shipped' },
      includeTables,
      generatedAt: new Date('2026-09-14T09:00:00Z'),
    }),
  };
}

describe('buildReport', () => {
  it('walks the SAME resolved panel list the page renders, in the same order', () => {
    const { page, built } = build(WITH_DATA);

    expect(built.document.panels.map((panel) => panel.id)).toEqual(
      page.panels.map((panel) => panel.id)
    );
    expect(built.document.route).toBe('/admin/usage');
  });

  it('renders one SVG asset per CHART panel, and none for the text-shaped ones', () => {
    const { built } = build(WITH_DATA);

    const charted = built.document.panels.filter((panel) => panel.chart);
    expect(charted.length).toBeGreaterThan(0);
    expect([...new Set(charted.map((panel) => panel.type))].sort()).toEqual(['donut', 'series']);
    for (const panel of charted) {
      const svg = built.assets[panel.chart as string];
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      // Print literals, never a CSS variable: Typst resolves neither `var()` nor custom
      // properties, so an unsubstituted token would be an INVISIBLE chart, not a wrong colour.
      expect(svg).not.toContain('var(--');
      expect(svg).not.toContain('chart-tooltip-card');
    }
    // A `stat` or a `table` panel is text on paper, and a real Typst table beats a picture of one.
    expect(built.document.panels.find((panel) => panel.type === 'stat')?.chart).toBeUndefined();
    expect(built.document.panels.find((panel) => panel.type === 'table')?.chart).toBeUndefined();
  });

  it('gives every chart panel its values as a table — paper has no hover', () => {
    const { built } = build(WITH_DATA);

    const donut = built.document.panels.find((panel) => panel.type === 'donut');
    expect(donut?.chart).toBeDefined();
    expect(donut?.table?.columns).toEqual(['Name', 'Value', 'Share']);
    expect(donut?.table?.rows.map((row) => row[0])).toContain('gpt-4o');
  });

  it('formats figures with the SAME functions the screen used', () => {
    const { built } = build(WITH_DATA);

    // 2 000 000 + 500 000 micro-USD = $2.50, through the shared `formatUsd` — not a local
    // `toFixed`, and not a raw micro-USD figure a million times too large.
    const totalCost = built.document.panels.find((panel) => panel.id === 'total-cost');
    expect(totalCost?.stats?.[0].value).toBe('$2.50');
  });

  it('SAYS a panel is unavailable rather than printing an empty section', () => {
    const { built } = build(ALL_FAILED);

    expect(built.document.panels.every((panel) => panel.unavailable)).toBe(true);
    expect(built.assets).toEqual({});
  });

  it('carries nothing a template could use to fetch something else', () => {
    const { built } = build(WITH_DATA);

    // The story's contract: a template decides document chrome, never what was queried. No query,
    // no scope, no URL and no credential reaches `data.json`.
    const serialised = JSON.stringify(built.document);
    expect(serialised).not.toContain('scope_id');
    expect(serialised).not.toContain('group_by');
    expect(serialised).not.toContain('Bearer');
  });

  it('records the reader’s include-tables choice without dropping the data', () => {
    const { built } = build(WITH_DATA, false);

    // The flag is the TEMPLATE's to honour — the data stays present so a customised template can
    // decide differently for its own route.
    expect(built.document.includeTables).toBe(false);
    expect(built.document.panels.some((panel) => panel.table)).toBe(true);
  });
});

describe('reportCsv', () => {
  it('emits one section per panel, naming each panel id', () => {
    const csv = reportCsv(build(WITH_DATA).built.document);

    expect(csv).toContain('# panel,total-cost,Total cost');
    expect(csv).toContain('# panel,actors-table,Actors');
    expect(csv).toContain('# route,/admin/usage');
    expect(csv).toContain('# range,This month');
  });

  it('names an unavailable panel instead of silently dropping its section', () => {
    expect(reportCsv(build(ALL_FAILED).built.document)).toContain('# unavailable');
  });

  it('quotes a field carrying a comma, per RFC 4180', () => {
    const { built } = build((resolved) =>
      resolved.queries.map(() =>
        response([point({ model: 'model,with,commas', user_id: 'usr_a' })])
      )
    );

    expect(reportCsv(built.document)).toContain('"model,with,commas"');
  });
});

describe('reportHtml', () => {
  it('previews the assembled report with its charts inlined — no Typst involved', () => {
    const { built } = build(WITH_DATA);

    const html = reportHtml(built.document, built.assets);

    expect(html).toContain('<title>Admin · Usage</title>');
    expect(html).toContain('Total cost');
    expect(html).toContain('$2.50');
    // The SVG is inlined VERBATIM: the preview shows exactly the picture the PDF embeds, colour
    // mistakes included, which is the point of having a preview at all.
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  });

  it('escapes every string that came from a usage response', () => {
    // Model names, user ids and account labels are attacker-influenced text arriving from the
    // usage backend. This document is opened in a browser tab.
    const { built } = build((resolved) =>
      resolved.queries.map(() =>
        response([point({ model: '<img src=x onerror=alert(1)>', user_id: 'usr_a' })])
      )
    );

    const html = reportHtml(built.document, built.assets);

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('honours the include-tables choice', () => {
    const withTables = build(WITH_DATA, true);
    const without = build(WITH_DATA, false);

    expect(reportHtml(withTables.built.document, withTables.built.assets)).toContain('gpt-4o');
    expect(reportHtml(without.built.document, without.built.assets)).not.toContain(
      '<tbody><tr><td>gpt-4o'
    );
  });
});
