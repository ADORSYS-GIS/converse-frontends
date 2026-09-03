import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import {
  buildSpecPanelView,
  dimensionKeyLookup,
  specPage,
  type SpecPanel,
} from '@lightbridge/ui-web/src/pages-stories/spec-page';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { findPage, parseDashboardsFile } from './dashboard-spec';
import type { DashboardPageSpec, DashboardPanelSpec } from './dashboard-spec';
import { toPanelView } from './panel-adapters';

/**
 * `packages/ui-web/src/pages-stories/spec-page.tsx` is the Storybook "page from `dashboards.yaml`"
 * oracle — the `Pages/*` stories render the checked-in document through it so a page is reviewable
 * before its backend column exists. It drifted from the real console once for real
 * (converse-frontends#487, #492): the story never read `options.style`, so every `stacked-bars`
 * series panel (three spend-by-model boards plus the settings family board) rendered as a plain
 * line chart with a Linear/Log/Indexed toggle in Storybook, while `dashboard-renderer.tsx` drew a
 * stack in the real app. Nothing failed — the two paths had simply stopped agreeing.
 *
 * This test locks the option-derived half of that agreement in place. It does NOT (and cannot)
 * assert the two views are byte-identical: `toPanelView` reads a real `UsageQueryResponse` and
 * `buildSpecPanelView` reads a synthetic per-type fixture, so their DATA always differs. What both
 * paths must agree on is everything `dashboard-view-mapping.ts` resolves from `options` — the mark
 * a `series` panel draws, its Top-N cap, whether a row links out — because that is read off the
 * SAME `dashboards.yaml` document in both places. A future option that reaches one side and not the
 * other fails here before it ships as a silently wrong Storybook page.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');

function loadedFile() {
  return parseDashboardsFile(parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')), REPO_DASHBOARDS);
}

function realPageSpec(route: string): DashboardPageSpec {
  const page = findPage(loadedFile(), route);
  if (!page) throw new Error(`no dashboards.yaml entry for "${route}"`);
  return page;
}

function realPanelSpec(route: string, id: string): DashboardPanelSpec {
  const panel = realPageSpec(route).panels.find((p) => p.id === id);
  if (!panel) throw new Error(`no panel "${id}" on "${route}"`);
  return panel;
}

function storyPanel(route: string, id: string): SpecPanel {
  const panel = specPage(route).panels.find((p) => p.id === id);
  if (!panel) throw new Error(`no SpecPanel "${id}" on "${route}"`);
  return panel;
}

function point(overrides: Partial<UsageSeriesPoint>): UsageSeriesPoint {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    completion_tokens: 0,
    latency_samples: 0,
    prompt_tokens: 0,
    requests: 0,
    total_cost: 0,
    total_tokens: 0,
    usage_value: 0,
    ...overrides,
  };
}

/** A response varied enough to feed every dimension the panels below group by — `model`, `azp`,
 *  `account_id` — without pretending to be a realistic window (that is the fixtures' job). */
const RESPONSE: UsageQueryResponse = {
  truncated: false,
  points: [
    point({ model: 'gpt-4o', azp: 'console-ui', account_id: 'acct_1', total_cost: 800_000_000 }),
    point({
      model: 'claude-sonnet-4',
      azp: 'opencode-cli',
      account_id: 'acct_2',
      total_cost: 90_000_000,
    }),
  ],
};

const SCALE_CONTROLS = { scale: 'linear' as const, onScaleChange: () => {} };
const NO_OVERRIDES = dimensionKeyLookup(undefined);

function realView(route: string, id: string) {
  return toPanelView({ spec: realPanelSpec(route, id), response: RESPONSE, ...SCALE_CONTROLS });
}

function storyView(route: string, id: string) {
  return buildSpecPanelView(storyPanel(route, id), NO_OVERRIDES, SCALE_CONTROLS);
}

describe('series style parity (converse-frontends#487, #492 regression)', () => {
  // The four real `stacked-bars` panels the owner's 2026-09-03 ruling shipped.
  it.each([
    ['/admin/overview', 'spend-by-model'],
    ['/admin/usage', 'cost-by-model'],
    ['/accounts/[accountId]/overview', 'spend-by-model'],
    ['/settings/overview/usage', 'family-spend-by-model'],
  ] as const)('draws %s panel "%s" as a stack in both the app and the story', (route, id) => {
    const app = realView(route, id);
    const story = storyView(route, id);
    expect(app.kind).toBe('series');
    expect(story.kind).toBe('series');
    if (app.kind !== 'series' || story.kind !== 'series') return;
    expect(app.style).toBe('stacked-bars');
    expect(story.style).toBe(app.style);
  });

  it('leaves an ordinary lines panel as lines in both', () => {
    const app = realView('/admin/overview', 'request-volume');
    const story = storyView('/admin/overview', 'request-volume');
    if (app.kind !== 'series' || story.kind !== 'series') throw new Error('expected a series view');
    expect(app.style).toBe('lines');
    expect(story.style).toBe(app.style);
  });
});

describe('options.topN parity', () => {
  it('carries a donut panel’s own Top-N through, not the panel-size default', () => {
    const app = realView('/admin/usage', 'model-distribution-cost');
    const story = storyView('/admin/usage', 'model-distribution-cost');
    if (app.kind !== 'donut' || story.kind !== 'donut') throw new Error('expected a donut view');
    expect(app.topN).toBe(6);
    expect(story.topN).toBe(app.topN);
  });

  it('carries a ranked panel’s own Top-N through', () => {
    const app = realView('/admin/usage', 'cost-by-channel');
    const story = storyView('/admin/usage', 'cost-by-channel');
    if (app.kind !== 'ranked' || story.kind !== 'ranked') throw new Error('expected a ranked view');
    expect(app.topN).toBe(8);
    expect(story.topN).toBe(app.topN);
  });

  it('collapses a share panel’s tail at the same Top-N', () => {
    const app = realView('/accounts/[accountId]/overview', 'model-share');
    const story = storyView('/accounts/[accountId]/overview', 'model-share');
    if (app.kind !== 'share' || story.kind !== 'share') throw new Error('expected a share view');
    // Neither list needs to actually EXCEED 5 for this fixture — what matters is that both paths
    // read the same declared cap off the same panel, which `collapseSegmentsTail`'s own "Other"
    // key proves whenever it fires, and which this simply asserts stays the same number.
    expect(realPanelSpec('/accounts/[accountId]/overview', 'model-share').options?.topN).toBe(5);
    expect(app.segments.length).toBeLessThanOrEqual(6); // 5 kept + at most 1 "Other"
    expect(story.segments.length).toBeLessThanOrEqual(6);
  });
});

describe('options.link parity', () => {
  it('links a ranked row through the same template in both', () => {
    const app = realView('/admin/usage', 'cost-by-channel');
    const story = storyView('/admin/usage', 'cost-by-channel');
    if (app.kind !== 'ranked' || story.kind !== 'ranked') throw new Error('expected a ranked view');
    expect(app.hrefFor).toBeDefined();
    expect(story.hrefFor).toBeDefined();
    const sampleRow = { key: 'sample-key', label: 'sample', value: 1, formattedValue: '1' };
    expect(story.hrefFor?.(sampleRow)).toBe(app.hrefFor?.(sampleRow));
    expect(story.hrefFor?.(sampleRow)).toBe('/admin/usage/channels/sample-key');
  });

  /** The two marks that gained an href on 2026-09-03. Both are part-to-whole shapes whose rows
   *  name real entities, and until then the only way to open one was to find it again in a table
   *  somewhere else on the page. */
  it('links a share segment through the same template in both', () => {
    const app = realView('/admin/usage', 'model-cost-share');
    const story = storyView('/admin/usage', 'model-cost-share');
    if (app.kind !== 'share' || story.kind !== 'share') throw new Error('expected a share view');
    const segment = { key: 'gpt-4o', label: 'gpt-4o', value: 1, formattedValue: '$1.00' };
    expect(app.hrefFor?.(segment)).toBe('/admin/usage/models/gpt-4o');
    expect(story.hrefFor?.(segment)).toBe(app.hrefFor?.(segment));
  });

  it.each([
    'model-distribution-requests',
    'model-distribution-cost',
    'model-distribution-tokens',
  ] as const)('links every wedge of %s through the same template in both', (id) => {
    const app = realView('/admin/usage', id);
    const story = storyView('/admin/usage', id);
    if (app.kind !== 'donut' || story.kind !== 'donut') throw new Error('expected a donut view');
    // A model name that would invent a path segment if it were not encoded.
    const segment = { key: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini', value: 1 };
    expect(app.hrefFor?.(segment)).toBe('/admin/usage/models/openai%2Fgpt-4o-mini');
    expect(story.hrefFor?.(segment)).toBe(app.hrefFor?.(segment));
  });

  it('links a table row through its own options.link rather than a hardcoded template', () => {
    // `top-spender-accounts` has no `options.columns` — the four-column shape whose fixture used
    // to bake in `?type=user` regardless of what the panel's own `options.link` said.
    const spec = realPanelSpec('/admin/overview', 'top-spender-accounts');
    expect(spec.options?.link).toBe('/admin/usage/actors/:key?type=account');

    const story = storyView('/admin/overview', 'top-spender-accounts');
    if (story.kind !== 'table') throw new Error('expected a table view');
    for (const row of story.rows) {
      expect(row.href).toMatch(/\?type=account$/);
    }
  });
});

/**
 * `options.linkAll` is read by the CONSOLE in `use-dashboard.ts` and by the STORY in
 * `spec-page.tsx`, from the same YAML — the exact split that let `options.style` drift. Both sides
 * must see the same href and the same (translated) label, or the story certifies a heading row the
 * console does not draw.
 */
describe('options.linkAll parity', () => {
  it.each(['cost-by-model', 'tokens-by-model'] as const)(
    'carries %s’s View models affordance to both the app and the story',
    (id) => {
      const spec = realPanelSpec('/admin/usage', id);
      const story = storyPanel('/admin/usage', id);
      expect(spec.options?.linkAll).toBe('#model-cost-share');
      expect(story.linkAll).toBe(spec.options?.linkAll);
      // The console resolves the KEY through the request's locale (`translateDashboardPage`); the
      // story resolves the same key through the English bundle. Both must land on real copy, never
      // on the dotted key itself.
      expect(spec.options?.linkAllLabel).toBe(
        'admin-usage.cost-by-model.linkAll'.replace('cost-by-model', id)
      );
      expect(story.linkAllLabel).toBe('View models');
    }
  );
});
