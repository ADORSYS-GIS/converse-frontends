import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadDashboards, resetDashboardsCache } from '../../dashboards/load-dashboards';
import {
  assertSafeRouteSegments,
  resolveReportTemplate,
  templateLookupPaths,
} from './template-resolver';

/**
 * The template lookup order, and the two properties the story states about it: the override wins
 * PER FILE, and every route in `dashboards.yaml` resolves to something.
 */

const originalTemplatesDir = process.env.CONSOLE_TEMPLATES_DIR;
const originalTemplatesRoot = process.env.CONSOLE_TEMPLATES_ROOT;

let overrideRoot: string;

beforeEach(() => {
  overrideRoot = mkdtempSync(join(tmpdir(), 'console-templates-'));
  delete process.env.CONSOLE_TEMPLATES_DIR;
  delete process.env.CONSOLE_TEMPLATES_ROOT;
  resetDashboardsCache();
});

afterEach(() => {
  rmSync(overrideRoot, { recursive: true, force: true });
  if (originalTemplatesDir === undefined) delete process.env.CONSOLE_TEMPLATES_DIR;
  else process.env.CONSOLE_TEMPLATES_DIR = originalTemplatesDir;
  if (originalTemplatesRoot === undefined) delete process.env.CONSOLE_TEMPLATES_ROOT;
  else process.env.CONSOLE_TEMPLATES_ROOT = originalTemplatesRoot;
  resetDashboardsCache();
});

function writeOverride(route: string, body: string): void {
  const dir = join(overrideRoot, ...route.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'report.typ'), body, 'utf8');
}

describe('templateLookupPaths', () => {
  it('puts the override first, then the shipped file, then the generic default', () => {
    process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;

    const paths = templateLookupPaths('/admin/usage');

    expect(paths.map((entry) => entry.origin)).toEqual(['override', 'shipped', 'default']);
    expect(paths[0].path).toBe(join(overrideRoot, 'admin', 'usage', 'report.typ'));
    expect(paths[1].path).toMatch(/templates\/admin\/usage\/report\.typ$/);
    expect(paths[2].path).toMatch(/templates\/_lib\/default\.typ$/);
  });

  it('offers no override candidate at all when the deployment has no template volume', () => {
    expect(templateLookupPaths('/admin/usage').map((entry) => entry.origin)).toEqual([
      'shipped',
      'default',
    ]);
  });

  it('keeps a [param] segment LITERAL — the template path mirrors the route path', () => {
    process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;

    expect(templateLookupPaths('/admin/usage/actors/[actorId]')[0].path).toBe(
      join(overrideRoot, 'admin', 'usage', 'actors', '[actorId]', 'report.typ')
    );
  });
});

describe('assertSafeRouteSegments', () => {
  it('refuses traversal and other shapes that could escape the templates root', () => {
    expect(() => assertSafeRouteSegments('/admin/../../etc')).toThrow(/Unsafe segment/);
    expect(() => assertSafeRouteSegments('/admin/./usage')).toThrow(/Unsafe segment/);
    expect(() => assertSafeRouteSegments('/admin/us\0age')).toThrow(/Unsafe segment/);
    expect(() => assertSafeRouteSegments('admin/usage')).toThrow(/must start with/);
  });

  it('accepts a real route, [param] segments included', () => {
    expect(assertSafeRouteSegments('/admin/usage/actors/[actorId]')).toEqual([
      'admin',
      'usage',
      'actors',
      '[actorId]',
    ]);
  });
});

describe('resolveReportTemplate', () => {
  it('reads the shipped template when no override exists', () => {
    const resolved = resolveReportTemplate('/admin/overview');

    expect(resolved.origin).toBe('shipped');
    expect(resolved.source).toContain('#import "_lib/report.typ"');
  });

  it('lets an override WIN for its own route', () => {
    process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;
    writeOverride('/admin/overview', '= Overridden\n');

    const resolved = resolveReportTemplate('/admin/overview');

    expect(resolved.origin).toBe('override');
    expect(resolved.source).toBe('= Overridden\n');
  });

  it('overrides PER FILE — a sibling route with no override file keeps the shipped one', () => {
    process.env.CONSOLE_TEMPLATES_DIR = overrideRoot;
    writeOverride('/admin/overview', '= Overridden\n');

    expect(resolveReportTemplate('/admin/overview').origin).toBe('override');
    expect(resolveReportTemplate('/admin/usage').origin).toBe('shipped');
  });

  it('falls back to the GENERIC template for a route with no template of its own', () => {
    const resolved = resolveReportTemplate('/some/page/nobody/styled');

    expect(resolved.origin).toBe('default');
    expect(resolved.source).toContain('panels-in-order(report)');
  });

  it('points an override at a directory that does not exist and overrides nothing', () => {
    // The Helm chart ALWAYS sets CONSOLE_TEMPLATES_DIR, mounted or not. That is only safe because
    // lookup is per file — an absent directory must be indistinguishable from no override.
    process.env.CONSOLE_TEMPLATES_DIR = join(overrideRoot, 'never-mounted');

    expect(resolveReportTemplate('/admin/overview').origin).toBe('shipped');
  });
});

describe('every dashboards.yaml route resolves to a template', () => {
  it('has a readable template for each declared page', () => {
    const routes = loadDashboards().pages.map((page) => page.route);

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const resolved = resolveReportTemplate(route);
      // `default` is a legitimate answer — a page without bespoke chrome is still exportable, and
      // that is the property being asserted: no declared route can fail to produce a document.
      expect(['shipped', 'default']).toContain(resolved.origin);
      expect(resolved.source.length).toBeGreaterThan(0);
    }
  });
});
