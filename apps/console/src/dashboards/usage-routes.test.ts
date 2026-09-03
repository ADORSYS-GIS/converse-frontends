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
  ADMIN_USAGE_MODEL_ROUTE,
  ADMIN_USAGE_ROUTE,
  channelHref,
  channelLinkTemplate,
  isAdminUsageActorType,
  modelHref,
  modelLinkTemplate,
} from './usage-routes';
import { decodeRouteParam } from '../shared/route-params';

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
      model: 'gpt-4o',
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
  it('states the five routes the area actually has', () => {
    expect(ADMIN_USAGE_ROUTE).toBe('/admin/usage');
    expect(ADMIN_USAGE_ACTOR_ROUTE).toBe('/admin/usage/actors/[actorId]');
    expect(ADMIN_USAGE_CHANNEL_ROUTE).toBe('/admin/usage/channels/[channelId]');
    expect(ADMIN_USAGE_MODEL_ROUTE).toBe('/admin/usage/models/[model]');
    expect(ADMIN_USAGE_CHATS_ROUTE).toBe('/admin/usage/chats');
  });

  it('has a dashboards.yaml entry for every one of them', () => {
    const file = dashboards();
    for (const route of [
      ADMIN_USAGE_ROUTE,
      ADMIN_USAGE_ACTOR_ROUTE,
      ADMIN_USAGE_CHANNEL_ROUTE,
      ADMIN_USAGE_MODEL_ROUTE,
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
    // A router-style gateway's model names carry a slash; Bedrock's carry a colon.
    expect(modelHref('openai/gpt-4o-mini')).toBe('/admin/usage/models/openai%2Fgpt-4o-mini');
    expect(modelHref('anthropic.claude-sonnet-4:0')).toBe(
      '/admin/usage/models/anthropic.claude-sonnet-4%3A0'
    );
  });
});

/**
 * The bug the owner reported on 2026-09-03, in the one shape that can regress it.
 *
 * A repo-slug account id (`cratestack/cratestack`) is encoded by the builder, handed to a page by
 * Next as the RAW segment (measured — see `decodeRouteParam`), and must arrive at the QUERY as the
 * original string. It did not: every panel on `/admin/usage/actors/cratestack%2Fcratestack` queried
 * `scope_id: "cratestack%2Fcratestack"`, an id that exists nowhere, and rendered a complete,
 * confident, empty dashboard.
 *
 * This walks the whole loop for real — builder → route decode → `resolveDashboard` → the resolved
 * query's own `scope_id`/`filters` — rather than asserting either half in isolation, because both
 * halves were individually correct the whole time. What was missing was the join.
 */
describe('an id that is not a bare token survives link → route → query', () => {
  /** What Next hands a PAGE: the raw path segment, exactly as it appears in the URL. */
  function routeSegmentOf(href: string, position: number): string {
    return new URL(href, 'https://console.invalid').pathname.split('/')[position];
  }

  it.each([
    ['cratestack/cratestack', 'account'],
    ['acme/widgets', 'user'],
    ['missing:github:preferred_username', 'user'],
  ] as const)('actor id %s under ?type=%s', (actorId, type) => {
    const href = actorHref(actorId, type);
    // The link does not invent a path segment…
    expect(routeSegmentOf(href, 3)).not.toContain('/');
    // …and the route's single decode gives the original id back.
    const decoded = decodeRouteParam(routeSegmentOf(href, 4));
    expect(decoded).toBe(actorId);

    const resolved = resolveDashboard({
      page: findPage(dashboards(), ADMIN_USAGE_ACTOR_ROUTE)!,
      window: { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-29T00:00:00Z') },
      filters: { actorId: decoded, type },
    });
    for (const query of resolved.queries) {
      expect(query.scope_id).toBe(actorId);
      expect(query.scope).toBe(type);
    }
  });

  it.each(['acme/cli', 'urn:client:ci', 'console ui'])('channel id %s', (channelId) => {
    const decoded = decodeRouteParam(routeSegmentOf(channelHref(channelId), 4));
    expect(decoded).toBe(channelId);

    const resolved = resolveDashboard({
      page: findPage(dashboards(), ADMIN_USAGE_CHANNEL_ROUTE)!,
      window: { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-29T00:00:00Z') },
      filters: { channelId: decoded },
    });
    for (const query of resolved.queries) {
      expect(query.filters?.azp).toBe(channelId);
    }
  });

  it.each(['gpt-4o', 'openai/gpt-4o-mini', 'anthropic.claude-sonnet-4:0'])('model %s', (model) => {
    const decoded = decodeRouteParam(routeSegmentOf(modelHref(model), 4));
    expect(decoded).toBe(model);

    const resolved = resolveDashboard({
      page: findPage(dashboards(), ADMIN_USAGE_MODEL_ROUTE)!,
      window: { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-29T00:00:00Z') },
      filters: { model: decoded },
    });
    for (const query of resolved.queries) {
      expect(query.filters?.model).toBe(model);
    }
  });

  /** A row's own href goes through the SAME encode — `panelRowHref` — so a linked row and a
   *  hand-built one cannot disagree about how a slash is spelled. */
  it('encodes a slug key identically whether the href came from a row or a builder', () => {
    expect(panelRowHref(modelLinkTemplate(), 'openai/gpt-4o-mini')).toBe(
      modelHref('openai/gpt-4o-mini')
    );
    expect(panelRowHref(channelLinkTemplate(), 'acme/cli')).toBe(channelHref('acme/cli'));
    expect(panelRowHref(actorLinkTemplate('account'), 'cratestack/cratestack')).toBe(
      actorHref('cratestack/cratestack', 'account')
    );
  });

  /** A hand-typed URL with a broken escape is not a 500. It stays as it stands, queries an id that
   *  does not exist, and renders the same "no usage" reading any unknown id gets. */
  it('leaves a malformed escape alone rather than throwing', () => {
    expect(decodeRouteParam('100%')).toBe('100%');
    expect(decodeRouteParam('%zz')).toBe('%zz');
    // …and decoding is not applied twice: a literal `%20` in an id survives one decode.
    expect(decodeRouteParam(routeSegmentOf(modelHref('a%20b'), 4))).toBe('a%20b');
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
      } else if (link.startsWith('/admin/usage/models/')) {
        expect(href, where).toBe(modelHref(key));
        expect(link, where).toBe(modelLinkTemplate());
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
