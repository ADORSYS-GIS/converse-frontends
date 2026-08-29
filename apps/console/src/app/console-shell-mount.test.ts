import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A structural regression guard for the one rule this app's routing exists to enforce:
 *
 *   **the console shell is mounted exactly once, in `app/(console)/layout.tsx`** — never by a
 *   route (console-ui skill "Composition — sections in the library, the shell mounted once, pages
 *   only in stories").
 *
 * The anti-pattern it guards against is what the tree looked like before: every route imported a
 * monolithic `*Page` that mounted its own ConsoleShell/ConsoleHeader/NavSpine, so navigation
 * rebuilt the entire chrome, no shell state could survive a route change, and every route bundled
 * the whole shell.
 *
 * This is a source-shape assertion, not a render test, precisely because the property is about
 * the ROUTE TREE rather than about any one component's output — and because the runtime half of
 * the same claim (the nav DOM node surviving a content swap by object identity) is checked
 * separately in `packages/ui-web/src/pages-stories/shell-persistence.stories.tsx`.
 */

const APP_DIR = join(__dirname);
const CONSOLE_GROUP = join(APP_DIR, '(console)');
const SRC_DIR = join(__dirname, '..');

const SHELL_IMPORT = /components\/console-shell/;
const HEADER_MOUNTS = /<ConsoleHeaderBar|components\/console-header/;
const NAV_MOUNTS = /components\/nav-spine/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.tsx') || full.endsWith('.ts') ? [full] : [];
  });
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('console shell mounting', () => {
  const isTest = (file: string) => file.endsWith('.test.ts') || file.endsWith('.test.tsx');
  const appFiles = walk(APP_DIR).filter((file) => !isTest(file));
  const srcFiles = walk(SRC_DIR).filter((file) => !isTest(file));

  it('mounts ConsoleShell in exactly one place, and that place is the (console) layout', () => {
    const mounts = srcFiles.filter((file) => SHELL_IMPORT.test(read(file)));

    expect(mounts).toHaveLength(1);
    expect(mounts[0]).toBe(join(CONSOLE_GROUP, 'layout.tsx'));
  });

  it('mounts the header and the nav spine only from that same layout', () => {
    const headerMounts = srcFiles.filter(
      (file) => HEADER_MOUNTS.test(read(file)) && !file.endsWith('console-chrome.tsx')
    );
    const navMounts = srcFiles.filter((file) => NAV_MOUNTS.test(read(file)));

    expect(headerMounts).toEqual([join(CONSOLE_GROUP, 'layout.tsx')]);
    // `console-chrome.tsx` only builds `NavSpineItem[]` data — a type-only import, which erases.
    expect(navMounts).toEqual([]);
  });

  it('has no route page that mounts any part of the shell', () => {
    const routePages = appFiles.filter((file) => file.endsWith('page.tsx'));
    expect(routePages.length).toBeGreaterThan(0);

    for (const page of routePages) {
      const source = read(page);
      expect(SHELL_IMPORT.test(source), `${page} must not mount ConsoleShell`).toBe(false);
      expect(NAV_MOUNTS.test(source), `${page} must not mount NavSpine`).toBe(false);
    }
  });

  it('gives both parallel-route slots a default, so a rail-less route renders rather than 404s', () => {
    const defaults = appFiles.filter((file) => file.endsWith('default.tsx'));

    expect(defaults.sort()).toEqual(
      [
        join(CONSOLE_GROUP, '@rail', 'default.tsx'),
        join(CONSOLE_GROUP, '@scope', 'default.tsx'),
      ].sort()
    );
  });

  /**
   * Which routes have rails is a DESIGN decision, so it is asserted as an explicit table rather
   * than as "every route must have one" (owner review 2026-08-29).
   *
   * Overview and Api-Keys have no rail at any tier: their parameters live in an always-visible
   * toolbar in the centre column, so a `@rail`/`@scope` segment for them would be an empty panel
   * column reserving 280px for nothing. Manage and Admin keep theirs, because their rail content
   * is selection-driven — it retargets on the row you pick and carries multi-field forms and
   * decision actions, which is the case the rail contract was written for.
   *
   * A route that opts out must NOT get a stub segment; it falls through to the slot's
   * `default.tsx` (asserted above), which renders nothing. The assertion below is two-sided on
   * purpose: a missing segment where one is expected is a bug, and so is a stray segment for a
   * route that is supposed to be rail-less — that is how this table stays true rather than
   * quietly rotting into "whatever the filesystem happens to contain".
   */
  it('gives a @rail and @scope segment to exactly the routes designed to have one', () => {
    const centreRoutes = appFiles
      .filter((file) => file.startsWith(CONSOLE_GROUP) && file.endsWith('page.tsx'))
      .filter((file) => !file.includes('@rail') && !file.includes('@scope'))
      .map((file) => file.slice(CONSOLE_GROUP.length + 1));

    expect(centreRoutes.sort()).toEqual(
      [
        'page.tsx',
        join('admin', 'page.tsx'),
        join('api-keys', 'page.tsx'),
        join('manage', 'page.tsx'),
      ].sort()
    );

    // EVERY route fills `@scope` (the left rail's secondary section — a sub-nav on Manage/Admin,
    // the screen's own controls on Overview/Api-Keys). Only selection-driven routes fill `@rail`.
    const ROUTES_WITH_RIGHT_RAIL = [join('admin', 'page.tsx'), join('manage', 'page.tsx')];

    for (const route of centreRoutes) {
      expect(
        appFiles.includes(join(CONSOLE_GROUP, '@scope', route)),
        `@scope is missing a segment for ${route}`
      ).toBe(true);

      const shouldHaveRightRail = ROUTES_WITH_RIGHT_RAIL.includes(route);
      expect(
        appFiles.includes(join(CONSOLE_GROUP, '@rail', route)),
        shouldHaveRightRail
          ? `@rail is missing a segment for ${route}`
          : `${route} is designed to have no right rail, but @rail has a segment for it`
      ).toBe(shouldHaveRightRail);
    }
  });

  it('keeps the auth routes outside the (console) group, so they get no shell', () => {
    const authPages = appFiles.filter((file) => file.includes(join('app', 'auth')));

    expect(authPages.length).toBeGreaterThan(0);
    for (const page of authPages) {
      expect(page.startsWith(CONSOLE_GROUP)).toBe(false);
    }
  });

  it('gates every /admin segment — centre and both slots — server-side on the admin role', () => {
    const adminSegments = appFiles.filter(
      (file) => file.startsWith(CONSOLE_GROUP) && file.includes(`${'admin'}${'/'}page.tsx`)
    );

    expect(adminSegments).toHaveLength(3);
    for (const segment of adminSegments) {
      const source = read(segment);
      expect(source, `${segment} must read the session server-side`).toContain('readSession');
      expect(source, `${segment} must 404 a non-admin`).toContain('notFound()');
    }
  });
});
