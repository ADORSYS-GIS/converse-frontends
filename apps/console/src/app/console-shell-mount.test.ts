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

  it('gates the /admin route server-side on the admin role', () => {
    const source = read(join(CONSOLE_GROUP, 'admin', 'page.tsx'));

    expect(source, 'admin/page.tsx must read the session server-side').toContain('readSession');
    expect(source, 'admin/page.tsx must 404 a non-admin').toContain('notFound()');
  });
});
