import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
 * Shell revamp phase 2 (2026-08-30): `ConsoleHeader`/`ConsoleHeaderBar` are deleted along with the
 * header band — the persistent chrome is now `ConsoleSidebarContent`/`ConsoleTopBarContent`
 * (`client/console-chrome.tsx`), composed into `ConsoleShell`'s `sidebar`/`topBar` slots. The
 * mount-once invariant is unchanged; only the names of what must be mounted exactly once changed.
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
const CHROME_MOUNTS = /ConsoleSidebarContent|ConsoleTopBarContent/;
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

  it('mounts the sidebar/top-bar chrome only from that same layout', () => {
    const chromeMounts = srcFiles.filter(
      (file) => CHROME_MOUNTS.test(read(file)) && !file.endsWith('console-chrome.tsx')
    );
    const navMounts = srcFiles.filter((file) => NAV_MOUNTS.test(read(file)));

    expect(chromeMounts).toEqual([join(CONSOLE_GROUP, 'layout.tsx')]);
    // `console-chrome.tsx` only imports `ConsoleSidebar`/`ConsoleTopBar` (the `ui-web` primitives)
    // and `NavGroup` (a type-only import, which erases) — never `nav-spine` directly.
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

  it('keeps the auth routes outside the (console) group, so they get no shell', () => {
    const authPages = appFiles.filter((file) => file.includes(join('app', 'auth')));

    expect(authPages.length).toBeGreaterThan(0);
    for (const page of authPages) {
      expect(page.startsWith(CONSOLE_GROUP)).toBe(false);
    }
  });

  it('gates /settings/refills-queue server-side on the admin role (the former /admin)', () => {
    // IA v3 phase 2: `/admin` moved wholesale to `/settings/refills-queue` (`git mv`, gate kept
    // verbatim) — `settings-route-gate.test.ts` is the full row-by-row guard for this route; this
    // is only the same one-line structural smoke check every OTHER test in this file already
    // gives every other shell-mounting concern.
    const source = read(join(CONSOLE_GROUP, 'settings', 'refills-queue', 'page.tsx'));

    expect(source, 'refills-queue/page.tsx must read the session server-side').toContain(
      'readSession'
    );
    expect(source, 'refills-queue/page.tsx must 404 a non-admin').toContain('notFound()');
  });

  /**
   * IA v3 phase 2 ("the settings area") — the settings area's own version of the account-area
   * check two tests below: `settings/layout.tsx` is a nested layout strictly BELOW the
   * shell-mounting `(console)/layout.tsx`, so crossing INTO or OUT OF `/settings/*` (a client-side
   * navigation, same mechanism as an account switch) cannot remount the shell either — there is no
   * file where a shell mount and this layout coexist for a remount to be possible. Combined with
   * the very first test in this file (`ConsoleShell` mounts in exactly one place, and it's the
   * ancestor layout), this is what makes "one shell, two nav surfaces, zero remounts" true by
   * construction across an area crossing, not only across an account switch.
   */
  it('keeps the settings area strictly below the shell-mounting layout, so crossing into it cannot remount the shell', () => {
    const settingsLayout = join(CONSOLE_GROUP, 'settings', 'layout.tsx');
    expect(existsSync(settingsLayout), 'settings/layout.tsx must exist').toBe(true);

    const source = read(settingsLayout);
    expect(
      SHELL_IMPORT.test(source),
      'settings/layout.tsx must not mount ConsoleShell — that stays the ancestor ' +
        "(console)/layout.tsx's job, which is what keeps it from remounting on an area crossing"
    ).toBe(false);
    expect(
      CHROME_MOUNTS.test(source),
      'settings/layout.tsx must not mount ConsoleSidebarContent/ConsoleTopBarContent either — ' +
        'it renders {children} only'
    ).toBe(false);
  });

  /**
   * IA v3 phase 1 ("account into the path") — the deliverable's own acceptance criterion: "the
   * shell does NOT remount on account switch." `ConsoleShell` mounts exactly once, in
   * `(console)/layout.tsx` — the FIRST test in this file already proves that in isolation.
   * `/accounts/[accountId]/layout.tsx` is a nested layout strictly BELOW it in the route tree, so
   * by the App Router's own routing model a change to the `[accountId]` dynamic segment can only
   * re-render/remount `accounts/[accountId]/layout.tsx` and what's inside it — it structurally
   * cannot touch an ANCESTOR layout. Combined, these two facts are what make "the shell survives
   * an account switch" true by construction rather than by convention: there is no file where a
   * shell mount and the `[accountId]` segment coexist for a remount to even be possible.
   *
   * The second half checks the actual account-switch TRIGGER — the workspace switcher
   * (`console-chrome.tsx`'s `onSelectAccount`) — uses client-side navigation (`router.push`,
   * `next/navigation`) rather than a hard browser navigation (`window.location`, a plain `<a>`),
   * which is what would force a full document reload and remount everything, shell included, even
   * though the shell itself never re-mounts on the SPA-navigation path this asserts is the one
   * actually wired up.
   */
  it('keeps the [accountId] segment strictly below the shell-mounting layout, so switching account cannot remount it', () => {
    const accountLayout = join(CONSOLE_GROUP, 'accounts', '[accountId]', 'layout.tsx');
    expect(existsSync(accountLayout), 'accounts/[accountId]/layout.tsx must exist').toBe(true);

    const source = read(accountLayout);
    expect(
      SHELL_IMPORT.test(source),
      'accounts/[accountId]/layout.tsx must not mount ConsoleShell — that stays the ancestor ' +
        "(console)/layout.tsx's job, which is what keeps it from remounting on account switch"
    ).toBe(false);
  });

  it('switches account via client-side navigation (router.push), never a hard reload', () => {
    const chrome = read(join(SRC_DIR, 'client', 'console-chrome.tsx'));
    expect(chrome).toMatch(/onSelectAccount:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?router\.push/);
    expect(chrome).not.toContain('window.location');
  });
});
