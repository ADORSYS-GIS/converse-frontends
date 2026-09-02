import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/usage`'s server-side role gate, and the two properties that make it a DECLARATIVE page
 * (converse-frontends#448, story C5).
 *
 * A source-shape assertion rather than a render test, for the same reason
 * `admin-refills-queue-route-gate.test.ts` is one: the property is about the route SEGMENT. It must
 * decrypt the session and `notFound()` a non-admin before generating any dashboard markup —
 * `notFound()` and not a 403, so a non-admin does not learn the route exists. That is still only
 * the UI half: every query this page issues is `scope: 'all'`, which the usage backend
 * independently gates on `usage:read-all` and `server/usage-scope-guard.ts` re-checks on the way
 * out.
 *
 * The second half of this file is the slice's headline claim — "adding a whole analytics page is
 * adding YAML, not writing containers" — asserted rather than believed: the container must render
 * through the engine and must contain no query code of its own.
 */
const USAGE_SEGMENT = join('src', 'app', '(console)', 'admin', 'usage', 'page.tsx');
const USAGE_CENTRE = join('src', 'containers', 'admin-usage-centre.tsx');

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('the /admin/usage permission gate', () => {
  it('decrypts the session and 404s a caller without usage:read-all', () => {
    const source = read(USAGE_SEGMENT);

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.usageReadAll)');
    expect(source).toContain('notFound()');
  });

  it('reads its panel list server-side and fails LOUD on a missing entry', () => {
    const source = read(USAGE_SEGMENT);

    // `loadDashboards()` is `node:fs` and prefers the config-volume override (owner ruling Q11), so
    // it can only run in the server component.
    expect(source).toContain('loadDashboards()');
    expect(source).toContain('findPage(loadDashboards(), ADMIN_USAGE_ROUTE)');
    // A missing entry throws rather than rendering an empty dashboard — this page IS its YAML
    // entry, so there is nothing to fall back to.
    expect(source).toContain('throw new Error(');
  });

  it('links to the page from the admin nav, which is never rendered for a non-admin', () => {
    const chrome = read(join('src', 'client', 'console-chrome.tsx'));

    expect(chrome).toContain("href: '/admin/usage'");
    expect(chrome).toContain('export function adminNavGroups');
  });
});

describe('the /admin/usage container', () => {
  it('renders through the engine — one useDashboard call, no per-panel query code', () => {
    const centre = read(USAGE_CENTRE);

    expect(centre).toContain('useDashboard({');
    expect(centre).toContain('<DashboardRenderer');
    // The failure mode this guards: a panel that "just needs one more query" being wired in by
    // hand here, which is exactly what externalizing the dashboards exists to end.
    expect(centre).not.toContain('queryUsage');
    expect(centre).not.toContain('useQueries');
  });

  it('holds range, lens, per-panel scale and per-table sort/page in the URL', () => {
    const centre = read(USAGE_CENTRE);

    expect(centre).toContain('useAdminUsageParams');
    // The per-panel knobs moved into the shared `useDashboardKnobs` with story C6, which added
    // three sibling pages needing the identical six callbacks. The URL param NAMES are still
    // stated once, in `url-state.ts`, and that hook is the only thing that reads them — asserted
    // from the other side below so this is not a claim about a file nobody checked.
    expect(centre).toContain('useDashboardKnobs(page)');
    // No component state for anything shareable (ADR 0011 Decision 3).
    expect(centre).not.toContain('useState');

    const knobs = read(join('src', 'dashboards', 'use-dashboard-knobs.ts'));
    expect(knobs).toContain('useDashboardScaleParams');
    expect(knobs).toContain('useDashboardTableParams');
  });
});
