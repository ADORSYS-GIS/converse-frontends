import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { ADMIN_USAGE_ACTOR_TYPES, ADMIN_USAGE_LENSES } from '../client/url-state';
import { UNASSIGNED_KEY } from '../containers/overview-usage';
import { DASHBOARD_LENSES, findPage, parseDashboardsFile } from './dashboard-spec';
import { panelRowHref } from './panel-adapters';
import { resolveDashboard } from './resolve-dashboard';
import {
  actorHref,
  actorLinkTemplate,
  ADMIN_USAGE_ACTOR_ROUTE,
  ADMIN_USAGE_ACTOR_TYPES as ROUTE_ACTOR_TYPES,
  ADMIN_USAGE_CHANNEL_ROUTE,
  ADMIN_USAGE_CHATS_ROUTE,
  ADMIN_USAGE_ROUTE,
  channelHref,
  channelLinkTemplate,
  isAdminUsageActorType,
} from './usage-routes';

/**
 * The ROUND TRIP the story asks for: "a route-builder round-trip against C5's link generation"
 * (converse-frontends#449).
 *
 * Every `options.link` template in `dashboards.yaml` — C4's two top-spender ledgers, C5's ranked
 * rows and tables, C6's own channel and actor rows — is resolved here for one row key and compared
 * against what `actorHref`/`channelHref` produce for that same key. A row that links to
 * `?type=user` while the page it lands on reads a three-valued enum is exactly the quiet wrongness
 * a shared builder exists to prevent, and it cannot be caught by a render test: both halves render
 * perfectly well while pointing at different pages.
 */

const REPO_DASHBOARDS = join(import.meta.dirname, '..', '..', 'dashboards.yaml');

function dashboards() {
  return parseDashboardsFile(parseYaml(readFileSync(REPO_DASHBOARDS, 'utf8')), REPO_DASHBOARDS);
}

/** Every `(page, panel, resolved link template)` triple the document declares, with `$lens`
 *  already substituted the way `resolve-dashboard.ts` substitutes it at render time. */
function declaredLinks(lens: string) {
  const rows: { route: string; panelId: string; link: string }[] = [];
  for (const page of dashboards().pages) {
    // Filters that satisfy every placeholder ANY page in the document carries — the links are
    // what is under test, not the resolver's error path (which `admin-usage-detail-pages.test.ts`
    // covers). A page added to the YAML with a new route param fails here loudly rather than
    // silently dropping out of the round trip, which is the point.
    const filters = {
      lens,
      actorId: 'act_1',
      type: 'account',
      channelId: 'opencode-cli',
      accountId: 'acct_1',
      projectId: 'proj_1',
      project: 'proj_1',
      sub: 'usr_1',
    };
    const resolved = resolveDashboard({
      page,
      window: { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-29T00:00:00Z') },
      filters,
      // C12's `scope: family` pages fan out over the session's own accounts; one is enough to
      // resolve, and none of them declares a row link anyway.
      familyAccountIds: ['acct_1'],
    });
    for (const panel of resolved.panels) {
      if (panel.link) rows.push({ route: page.route, panelId: panel.spec.id, link: panel.link });
    }
  }
  return rows;
}

describe('the /admin/usage route vocabulary', () => {
  it('states the four routes the area actually has', () => {
    expect(ADMIN_USAGE_ROUTE).toBe('/admin/usage');
    expect(ADMIN_USAGE_ACTOR_ROUTE).toBe('/admin/usage/actors/[actorId]');
    expect(ADMIN_USAGE_CHANNEL_ROUTE).toBe('/admin/usage/channels/[channelId]');
    expect(ADMIN_USAGE_CHATS_ROUTE).toBe('/admin/usage/chats');
  });

  it('has a dashboards.yaml entry for every one of them', () => {
    const file = dashboards();
    for (const route of [
      ADMIN_USAGE_ROUTE,
      ADMIN_USAGE_ACTOR_ROUTE,
      ADMIN_USAGE_CHANNEL_ROUTE,
      ADMIN_USAGE_CHATS_ROUTE,
    ]) {
      expect(findPage(file, route), route).toBeDefined();
    }
  });

  /** Three lists, one vocabulary: the engine's lens, `url-state.ts`'s `?type=` parser, and the
   *  builder's own enum. They are declared separately on purpose (that module is the app's only
   *  `nuqs` importer and stays free of engine imports) — so they are asserted equal here. */
  it('keeps the lens, the ?type= parser and the builder in agreement, users first', () => {
    expect([...ROUTE_ACTOR_TYPES]).toEqual([...DASHBOARD_LENSES]);
    expect([...ADMIN_USAGE_ACTOR_TYPES]).toEqual([...ROUTE_ACTOR_TYPES]);
    expect([...ADMIN_USAGE_LENSES]).toEqual([...ROUTE_ACTOR_TYPES]);
    expect(ROUTE_ACTOR_TYPES[0]).toBe('user');
  });

  it('accepts exactly the three types and refuses everything else', () => {
    for (const type of ROUTE_ACTOR_TYPES) expect(isAdminUsageActorType(type)).toBe(true);
    for (const bad of ['api_key', 'all', 'User', '', undefined, null]) {
      expect(isAdminUsageActorType(bad as string | undefined), String(bad)).toBe(false);
    }
  });

  it('encodes an id that is not a bare token — a sentinel key, a repo-slug account', () => {
    // The usage backend's own sentinel for an identity provider that returned no username.
    expect(actorHref('missing:github:preferred_username', 'user')).toBe(
      '/admin/usage/actors/missing%3Agithub%3Apreferred_username?type=user'
    );
    // An `owner/repo` account id must not invent a path segment.
    expect(actorHref('acme/widgets', 'account')).toBe(
      '/admin/usage/actors/acme%2Fwidgets?type=account'
    );
    expect(channelHref('console ui')).toBe('/admin/usage/channels/console%20ui');
  });
});

describe('every declared row link resolves to the page it claims', () => {
  it.each([...ROUTE_ACTOR_TYPES])('under lens=%s', (lens) => {
    const links = declaredLinks(lens);
    // A guard against the whole test passing vacuously if `options.link` were ever dropped.
    expect(links.length).toBeGreaterThanOrEqual(6);

    for (const { route, panelId, link } of links) {
      const where = `${route} / ${panelId}`;
      const key = 'row-key';
      const href = panelRowHref(link, key);
      expect(href, where).toBeDefined();

      if (link.startsWith('/admin/usage/actors/')) {
        // `?type=` is whatever the template resolved to — the page's lens for a lens-driven panel,
        // the literal the YAML wrote otherwise. Either way it must be a type the actor page reads.
        const type = new URL(href!, 'https://console.invalid').searchParams.get('type');
        expect(isAdminUsageActorType(type), `${where} → ${href!}`).toBe(true);
        expect(href, where).toBe(actorHref(key, type as (typeof ROUTE_ACTOR_TYPES)[number]));
        expect(link, where).toBe(actorLinkTemplate(type as (typeof ROUTE_ACTOR_TYPES)[number]));
      } else {
        expect(href, where).toBe(channelHref(key));
        expect(link, where).toBe(channelLinkTemplate());
      }
    }
  });

  it('carries the lens into ?type= on every lens-driven actor link', () => {
    for (const lens of ROUTE_ACTOR_TYPES) {
      const lensDriven = declaredLinks(lens).filter(
        (row) => row.route === ADMIN_USAGE_ROUTE && row.link.includes('/actors/')
      );
      expect(lensDriven.length, lens).toBeGreaterThan(0);
      for (const row of lensDriven) {
        expect(row.link, `${row.panelId} under lens=${lens}`).toBe(actorLinkTemplate(lens));
      }
    }
  });

  it('leaves an Unassigned row unlinked — there is no actor page for "nobody"', () => {
    // `panelRowHref` refuses the sentinel key rather than building `/actors/unassigned`.
    expect(panelRowHref(actorLinkTemplate('user'), UNASSIGNED_KEY)).toBeUndefined();
  });
});
