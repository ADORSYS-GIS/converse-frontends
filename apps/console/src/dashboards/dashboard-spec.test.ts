import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { DASHBOARD_PANEL_TYPES } from '@lightbridge/ui-web/src/sections/dashboard-panels';

import {
  DERIVED_METRICS,
  dashboardsFileSchema,
  derivedMetricName,
  findPage,
  parseDashboardsFile,
} from './dashboard-spec';

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');
const BROKEN_FIXTURE = join(import.meta.dirname, 'fixtures', 'broken-dashboards.yaml');

function loadYaml(path: string): unknown {
  return parseYaml(readFileSync(path, 'utf8'));
}

/**
 * The build-time half of the AC "the checked-in `dashboards.yaml` parses and validates; an invalid
 * file FAILS the test, asserted with a deliberately broken fixture." The startup half is
 * `load-dashboards.test.ts`.
 */
describe('the checked-in dashboards.yaml', () => {
  it('parses and validates against the schema', () => {
    const file = parseDashboardsFile(loadYaml(REPO_DASHBOARDS), REPO_DASHBOARDS);
    expect(file.pages.length).toBeGreaterThan(0);
  });

  it('sets an explicit limit on every panel query — never a server default', () => {
    const file = parseDashboardsFile(loadYaml(REPO_DASHBOARDS), REPO_DASHBOARDS);
    for (const page of file.pages) {
      for (const panel of page.panels) {
        expect(panel.query.limit, `${page.route} / ${panel.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('names only panel types the renderer registry actually implements', () => {
    const file = parseDashboardsFile(loadYaml(REPO_DASHBOARDS), REPO_DASHBOARDS);
    for (const page of file.pages) {
      for (const panel of page.panels) {
        expect(DASHBOARD_PANEL_TYPES).toContain(panel.type);
      }
    }
  });

  it('exposes its pages by route', () => {
    const file = parseDashboardsFile(loadYaml(REPO_DASHBOARDS), REPO_DASHBOARDS);
    expect(findPage(file, '/admin/usage')).toBeDefined();
    expect(findPage(file, '/nope')).toBeUndefined();
  });
});

describe('the deliberately broken fixture', () => {
  it('fails validation rather than parsing into a half-page', () => {
    expect(() => parseDashboardsFile(loadYaml(BROKEN_FIXTURE), BROKEN_FIXTURE)).toThrow();
  });

  /** The AC's "fails loud with a message naming the offending page and panel id" — a positional
   *  path like `pages.0.panels.2.span` is not a message a person can act on. */
  it('names the offending page and panel id in the message', () => {
    let message = '';
    try {
      parseDashboardsFile(loadYaml(BROKEN_FIXTURE), BROKEN_FIXTURE);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('/admin/broken');
    expect(message).toContain('bad-span');
    expect(message).toContain('unknown-type');
    expect(message).toContain('unknown-derived');
    expect(message).toContain('no-limit');
  });
});

describe('the schema itself', () => {
  const validPanel = {
    id: 'p1',
    type: 'stat' as const,
    title: 'Total cost',
    span: 1 as const,
    metric: 'cost' as const,
    query: { scope: 'all', limit: 100 },
  };
  const validFile = { pages: [{ route: '/x', filters: [], panels: [validPanel] }] };

  it('accepts a minimal valid document', () => {
    expect(dashboardsFileSchema.safeParse(validFile).success).toBe(true);
  });

  it.each([
    ['an unknown panel type', { ...validPanel, type: 'pie' }],
    ['an unknown derived metric', { ...validPanel, metric: 'derived:whateverIWant' }],
    ['a span of 3', { ...validPanel, span: 3 }],
    ['a missing limit', { ...validPanel, query: { scope: 'all' } }],
    ['a zero limit', { ...validPanel, query: { scope: 'all', limit: 0 } }],
    ['an unknown panel key', { ...validPanel, colour: 'red' }],
    ['an unknown query key', { ...validPanel, query: { scope: 'all', limit: 10, offset: 5 } }],
    ['an unknown option', { ...validPanel, options: { pie: true } }],
  ])('rejects %s', (_label, panel) => {
    const result = dashboardsFileSchema.safeParse({
      pages: [{ route: '/x', filters: [], panels: [panel] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a route that is not a path', () => {
    expect(
      dashboardsFileSchema.safeParse({
        pages: [{ route: 'admin', filters: [], panels: [validPanel] }],
      }).success
    ).toBe(false);
  });

  it('rejects duplicate panel ids on one page, and duplicate page routes', () => {
    expect(
      dashboardsFileSchema.safeParse({
        pages: [{ route: '/x', filters: [], panels: [validPanel, { ...validPanel }] }],
      }).success
    ).toBe(false);

    expect(
      dashboardsFileSchema.safeParse({
        pages: [
          { route: '/x', filters: [], panels: [validPanel] },
          { route: '/x', filters: [], panels: [{ ...validPanel, id: 'p2' }] },
        ],
      }).success
    ).toBe(false);
  });

  it('accepts every derived metric it declares, and only those', () => {
    for (const name of DERIVED_METRICS) {
      const result = dashboardsFileSchema.safeParse({
        pages: [
          { route: '/x', filters: [], panels: [{ ...validPanel, metric: `derived:${name}` }] },
        ],
      });
      expect(result.success, name).toBe(true);
    }
  });

  it('reads a derived metric name back out, and reports null for a base metric', () => {
    expect(derivedMetricName('derived:activeActors')).toBe('activeActors');
    expect(derivedMetricName('cost')).toBeNull();
  });

  it('covers exactly the renderer registry vocabulary — no type without a renderer', () => {
    for (const type of DASHBOARD_PANEL_TYPES) {
      const result = dashboardsFileSchema.safeParse({
        pages: [{ route: '/x', filters: [], panels: [{ ...validPanel, type }] }],
      });
      expect(result.success, type).toBe(true);
    }
  });
});
