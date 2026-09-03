import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetDashboardsCache } from '../../dashboards/load-dashboards';
import { englishT } from '../../test/english-t';
import {
  deriveReportTitle,
  knownReportRoutes,
  parseRange,
  reportSlug,
  resolvePageReport,
} from './page-report';

/**
 * `?path=…` → a resolved dashboard. The security property under test is the one the story states
 * as a negative case: `path` is matched by EQUALITY against the routes `dashboards.yaml` declares
 * and is never used to read a file, so traversal is refused before anything touches the disk.
 */

const NOW = new Date('2026-09-14T12:00:00.000Z');

function resolve(path: string | null, params: Record<string, string> = {}) {
  return resolvePageReport({
    path,
    range: params.range ?? 'mtd',
    from: params.from ?? null,
    to: params.to ?? null,
    param: (name) => params[name] ?? null,
    now: NOW,
    t: englishT('common'),
    tDashboards: englishT('dashboards'),
  });
}

beforeEach(() => resetDashboardsCache());
afterEach(() => resetDashboardsCache());

describe('resolvePageReport — route validation', () => {
  it('resolves a declared route', () => {
    const outcome = resolve('/admin/usage');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.resolved.route).toBe('/admin/usage');
    expect(outcome.resolved.queries.length).toBeGreaterThan(0);
    // The dedupe is the engine's, not this route's — asserted here so the "no second, divergent
    // query implementation" claim is checkable: nine panels, fewer requests.
    expect(outcome.resolved.queries.length).toBeLessThan(outcome.resolved.panels.length);
  });

  it('refuses a route that is not declared, and NAMES what it would have accepted', () => {
    const outcome = resolve('/admin/not-a-page');

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.kind).toBe('unknown_route');
    if (outcome.failure.kind !== 'unknown_route') return;
    expect(outcome.failure.known).toEqual(knownReportRoutes());
  });

  it.each([
    '../../etc/passwd',
    '/admin/../../etc/passwd',
    '/../templates/_lib/report.typ',
    '/admin/usage/../../../../etc/hosts',
    '',
  ])('refuses the traversal attempt %j as an unknown route', (path) => {
    const outcome = resolve(path);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    // Not "unsafe path" — UNKNOWN ROUTE. Nothing tried to normalise or read it; it simply is not
    // one of the strings this process read out of its own document.
    expect(outcome.failure.kind).toBe('unknown_route');
  });

  it('refuses a null path the same way', () => {
    const outcome = resolve(null);
    expect(outcome.ok).toBe(false);
  });
});

/**
 * The account-family fan-out (C12, converse-frontends#455). A report route has no session, so it
 * cannot know which accounts the caller owns — and a page whose every panel needs that list must be
 * refused rather than rendered as a document of unavailable panels, which a reader would fairly
 * mistake for "no usage".
 */
describe('resolvePageReport — a scope: family page', () => {
  it('is refused, naming the route and the reason', () => {
    const outcome = resolve('/settings/overview/usage');

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.kind).toBe('unexportable_route');
    if (outcome.failure.kind !== 'unexportable_route') return;
    expect(outcome.failure.route).toBe('/settings/overview/usage');
    expect(outcome.failure.message).toMatch(/account family/i);
    // It says what to do instead, rather than only what it will not do.
    expect(outcome.failure.message).toMatch(/per-account overview/i);
  });

  /** The per-account page asks the same question with a scope the route CAN resolve — so it must
   *  keep working, or the refusal above would be a dead end rather than a redirection. */
  it('still exports the per-account overview it points at', () => {
    const outcome = resolve('/accounts/[accountId]/overview', { accountId: 'acct_1' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.resolved.queries.every((query) => query.scope === 'account')).toBe(true);
    expect(outcome.resolved.queries.every((query) => query.scope_id === 'acct_1')).toBe(true);
  });
});

describe('resolvePageReport — window and filters', () => {
  it('applies the range preset, defaulting to mtd like every dashboard page', () => {
    const outcome = resolve('/admin/usage', { range: '7d' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const spanDays =
      (outcome.resolved.window.end.getTime() - outcome.resolved.window.start.getTime()) /
      86_400_000;
    // The preset's own span, exactly — a `compare: true` panel adds a twin query and never moves
    // the window the report is drawn over (converse-frontends#448).
    expect(spanDays).toBe(7);
    expect(outcome.context.rangeLabel).toBe('Last 7 days');
  });

  it('lets an explicit from/to span win over the preset', () => {
    const outcome = resolve('/admin/usage', { range: '90d', from: '2026-08-01', to: '2026-08-08' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.resolved.window.start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('reads ONLY the filters the page declares', () => {
    const outcome = resolve('/admin/usage', { lens: 'account', somethingElse: 'ignored' });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.context.filters).toEqual([{ label: 'lens', value: 'account' }]);
  });
});

describe('deriveReportTitle', () => {
  // Derived, never accepted from the caller: a caller-supplied title is text this console would be
  // printing into a document on someone else's behalf.
  it('names the page from its route, dropping [param] segments', () => {
    expect(deriveReportTitle('/admin/overview')).toBe('Admin · Overview');
    expect(deriveReportTitle('/admin/usage/actors/[actorId]')).toBe('Admin · Usage · Actors');
    expect(deriveReportTitle('/accounts/[accountId]/overview')).toBe('Accounts · Overview');
    expect(deriveReportTitle('/admin/refill-policies')).toBe('Admin · Refill Policies');
  });
});

describe('reportSlug', () => {
  it('substitutes the param VALUES so two actor reports have different file names', () => {
    expect(reportSlug('/admin/usage/actors/[actorId]', { actorId: 'usr_abc123' })).toBe(
      'admin-usage-actors-usr-abc123'
    );
    expect(reportSlug('/admin/overview', {})).toBe('admin-overview');
  });

  it('falls back to the param NAME rather than producing a nameless file', () => {
    expect(reportSlug('/admin/usage/actors/[actorId]', {})).toBe('admin-usage-actors-actorid');
  });
});

describe('parseRange', () => {
  it('defaults anything it does not recognise to mtd', () => {
    expect(parseRange('7d')).toBe('7d');
    expect(parseRange('nonsense')).toBe('mtd');
    expect(parseRange(null)).toBe('mtd');
  });
});
