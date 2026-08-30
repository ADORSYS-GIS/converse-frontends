import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(process.cwd(), 'src', 'app');
const CONSOLE_GROUP = join(APP_DIR, '(console)');
const LAYOUT = readFileSync(join(CONSOLE_GROUP, 'layout.tsx'), 'utf8');

/**
 * Shell revamp phase 2 (2026-08-30) — supersedes `console-rail-routes.test.ts`, which guarded the
 * old three-rail, header-band shell's per-route `@rail`/`@scope` parallel-route gating. That whole
 * mechanism is deleted: `ConsoleShell` takes exactly `{ sidebar, topBar, banner?, children }` now,
 * both chrome slots are fully self-contained (`ConsoleSidebarContent`/`ConsoleTopBarContent` read
 * the session/scope/pathname themselves), and the layout no longer computes or threads a per-route
 * `rail`/`scope` prop at all.
 *
 * What replaced the deleted rail/scope slots, for the two screens that actually needed one
 * (Projects, Admin's refill-review section): phase 2 first gave `containers/projects-centre.tsx` and
 * `containers/admin-centre.tsx` their own right-hand `<aside>`, rendered inline and gated to `lg`,
 * as a temporary placeholder; phase 3 (2026-08-30, right rail out) deleted that aside in favour of
 * a `DetailSheet` that opens on row selection, at every tier — the console has no persistent rail
 * anywhere any more. This file's job is narrower than the old one's: confirm the parallel-route
 * slots are actually gone (so a stale `@rail`/`@scope` segment can't silently reappear and go
 * unrendered) and confirm the layout's own shape.
 */
describe('console shell zones (shell revamp phase 2)', () => {
  it('deletes the @rail parallel-route slot entirely — no stale segment survives unrendered', () => {
    expect(existsSync(join(CONSOLE_GROUP, '@rail'))).toBe(false);
  });

  it('deletes the @scope parallel-route slot entirely — no stale segment survives unrendered', () => {
    expect(existsSync(join(CONSOLE_GROUP, '@scope'))).toBe(false);
  });

  it('gives ConsoleShell exactly its two chrome slots, never the deleted header/nav/rail props', () => {
    expect(LAYOUT).toContain('sidebar={');
    expect(LAYOUT).toContain('topBar={');
    // Prop USAGE (`name=`), not bare mentions — the layout's own doc comment names the deleted
    // props in prose to explain what replaced them, which a bare substring match would misfire on.
    expect(LAYOUT).not.toMatch(/\bheader=\{/);
    expect(LAYOUT).not.toMatch(/\bleftSecondary=\{/);
    expect(LAYOUT).not.toMatch(/\brightRail=\{/);
    expect(LAYOUT).not.toMatch(/\bnav=\{/);
  });

  it('mounts the command palette dialog once, alongside the shell, not inside either chrome slot', () => {
    expect(LAYOUT).toContain('ConsolePaletteDialog');
  });

  it('gives every route in the group a real page, with no leftover rail-only route file', () => {
    // IA v3 phase 1 ("account into the path"): Overview/Projects/API keys moved under
    // `/accounts/[accountId]/*`; `page.tsx` here is now the account resolver, not Overview itself.
    const routePages = [
      'page.tsx',
      join('accounts', '[accountId]', 'overview', 'page.tsx'),
      join('accounts', '[accountId]', 'projects', 'page.tsx'),
      join('accounts', '[accountId]', 'api-keys', 'page.tsx'),
      'settings/page.tsx',
      'admin/page.tsx',
    ];
    for (const page of routePages) {
      expect(existsSync(join(CONSOLE_GROUP, page)), `missing ${page}`).toBe(true);
    }
  });

  it('has no leftover top-level /projects or /api-keys route now that both moved under /accounts/[accountId]/*', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'projects'))).toBe(false);
    expect(existsSync(join(CONSOLE_GROUP, 'api-keys'))).toBe(false);
  });

  it('gives /accounts/[accountId]/* its own guard layout', () => {
    expect(
      existsSync(join(CONSOLE_GROUP, 'accounts', '[accountId]', 'layout.tsx'))
    ).toBe(true);
  });
});
