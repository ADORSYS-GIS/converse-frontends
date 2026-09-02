import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The three `/admin/usage` drill-down routes' server-side gates (converse-frontends#449, story C6).
 *
 * Source-shape assertions rather than render tests, for the same reason
 * `admin-usage-route-gate.test.ts` uses them: the property is about the route SEGMENT — it must
 * decrypt the session and `notFound()` a caller without `usage:read-all` before generating any
 * dashboard markup, and `notFound()` rather than a 403 so they do not learn the route exists. The
 * permission is the SAME one the usage backend enforces on the queries these pages issue
 * (converse-frontends#452 replaced the `lightbridge-admin` role check), so the two agree by
 * construction rather than by a role that happened to carry it.
 *
 * The second half is the slice's own headline claim — "a parameterised page is YAML plus two
 * placeholders, not a container" — asserted rather than believed: each centre renders through the
 * engine and contains no query code of its own.
 */
const ACTOR_SEGMENT = join('src', 'app', '(console)', 'admin', 'usage', 'actors', '[actorId]');
const CHANNEL_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'admin',
  'usage',
  'channels',
  '[channelId]'
);
const CHATS_SEGMENT = join('src', 'app', '(console)', 'admin', 'usage', 'chats');

const CENTRES = {
  actor: join('src', 'containers', 'admin-usage-actor-centre.tsx'),
  channel: join('src', 'containers', 'admin-usage-channel-centre.tsx'),
  chats: join('src', 'containers', 'admin-usage-chats-centre.tsx'),
};

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('the /admin/usage drill-down role gates', () => {
  it.each([
    ['actors/[actorId]', ACTOR_SEGMENT],
    ['channels/[channelId]', CHANNEL_SEGMENT],
    ['chats', CHATS_SEGMENT],
  ])('%s decrypts the session and 404s a caller without usage:read-all', (_name, segment) => {
    const source = read(join(segment, 'page.tsx'));

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.usageReadAll)');
    expect(source).toContain('notFound()');
    // The role check C9 deleted must not come back on any of these three either — asserted
    // repo-wide by `no-role-derived-gates.test.ts` rather than restated here, because naming the
    // forbidden identifier in a string literal is exactly what that scan (rightly) flags.
  });

  it.each([
    ['actors/[actorId]', ACTOR_SEGMENT],
    ['channels/[channelId]', CHANNEL_SEGMENT],
    ['chats', CHATS_SEGMENT],
  ])('%s reads its panel list server-side and fails LOUD on a missing entry', (_name, segment) => {
    const source = read(join(segment, 'page.tsx'));

    // `loadDashboards()` is `node:fs` and prefers the config-volume override (owner ruling Q11),
    // so it can only run in the server component.
    expect(source).toContain('findPage(loadDashboards()');
    // A missing entry throws rather than rendering an empty dashboard — the page IS its entry.
    expect(source).toContain('throw new Error(');
  });

  it.each([
    ['actors/[actorId]', ACTOR_SEGMENT],
    ['channels/[channelId]', CHANNEL_SEGMENT],
    ['chats', CHATS_SEGMENT],
  ])('%s draws a skeleton of the real span pattern while it loads', (_name, segment) => {
    const loading = read(join(segment, 'loading.tsx'));

    expect(loading).toContain('PANEL_SPANS');
    expect(loading).toContain('DashboardGrid');
  });

  /**
   * The one route param that is CHECKED rather than passed through. `?type=` is substituted into
   * every panel's `scope`, a closed enum deciding whose data comes back — a typo must be a 404
   * here rather than a backend 400 arriving under a page that has already printed a name.
   */
  it('404s an unrecognised or missing ?type= on the actor route', () => {
    const source = read(join(ACTOR_SEGMENT, 'page.tsx'));

    expect(source).toContain('isAdminUsageActorType(rawType)');
    expect(source).toMatch(
      /if \(!actorId \|\| !isAdminUsageActorType\(rawType\)\) \{\s*notFound\(\);/
    );
  });

  /** …and an unresolvable actor LABEL is emphatically not one: an id with real usage rows renders
   *  in full under a sentinel header. Asserted from the container, which is where that decision
   *  lives — the route never sees a label at all. */
  it('never 404s an id whose label did not resolve', () => {
    const centre = read(CENTRES.actor);

    expect(centre).toContain('identity.subtle');
    expect(centre).not.toContain('notFound');
  });
});

describe('the /admin/usage drill-down containers', () => {
  it.each(Object.entries(CENTRES))(
    '%s renders through the engine — one useDashboard call, no per-panel query code',
    (_name, path) => {
      const centre = read(path);

      expect(centre).toContain('useDashboard({');
      expect(centre).toContain('<DashboardRenderer');
      // The failure mode this guards: a panel that "just needs one more query" wired in by hand.
      expect(centre).not.toContain('queryUsage');
      expect(centre).not.toContain('useQueries');
    }
  );

  it.each(Object.entries(CENTRES))(
    '%s holds its window in the URL, not in state',
    (_name, path) => {
      const centre = read(path);

      expect(centre).toMatch(/useAdminUsage(Actor|Window)Params/);
      expect(centre).toContain('useDashboardKnobs(page)');
      // ADR 0011 Decision 3 — nothing shareable lives in component state.
      expect(centre).not.toContain('useState');
    }
  );

  it.each(Object.entries(CENTRES))(
    '%s carries the Export action every YAML page has',
    (_n, path) => {
      expect(read(path)).toContain('<DashboardExportButton');
    }
  );

  it('gives the two drill-downs a real anchor back to /admin/usage', () => {
    for (const path of [CENTRES.actor, CENTRES.channel]) {
      const centre = read(path);
      expect(centre).toContain('ADMIN_USAGE_ROUTE');
      expect(centre).toContain('render={<Link href={ADMIN_USAGE_ROUTE} />}');
    }
  });

  it('puts Chats behind the usage sub-nav rather than a sixth admin rail row', () => {
    // Both SECTION pages carry the tab row…
    expect(read(join('src', 'containers', 'admin-usage-centre.tsx'))).toContain(
      '<AdminUsageSubNav />'
    );
    expect(read(CENTRES.chats)).toContain('<AdminUsageSubNav />');
    // …and the drill-downs do not: they are one row of the area, opened, not a section of it.
    expect(read(CENTRES.actor)).not.toContain('AdminUsageSubNav');
    expect(read(CENTRES.channel)).not.toContain('AdminUsageSubNav');

    // The rail still lights ONE row for every path in the area, by prefix.
    const chrome = read(join('src', 'client', 'console-chrome.tsx'));
    expect(chrome).toContain("if (pathname.startsWith('/admin/usage')) return 'usage';");
  });
});
