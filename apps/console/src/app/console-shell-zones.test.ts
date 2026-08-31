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
 * `containers/refills-queue-centre.tsx` their own right-hand `<aside>`, rendered inline and gated to `lg`,
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
      join('accounts', '[accountId]', 'api-keys', 'page.tsx'),
      'settings/page.tsx',
      join('settings', 'accounts', 'page.tsx'),
      join('settings', 'accounts', '[accountId]', 'page.tsx'),
      join('settings', 'accounts', '[accountId]', 'projects', 'page.tsx'),
      join('settings', 'accounts', '[accountId]', 'request-refill', 'page.tsx'),
      join('settings', 'overview', 'page.tsx'),
      join('settings', 'overview', 'usage', 'page.tsx'),
      join('settings', 'policies', 'page.tsx'),
      join('settings', 'tiers', 'page.tsx'),
      join('settings', 'refill-options', 'page.tsx'),
      join('settings', 'info', 'page.tsx'),
      join('admin', 'page.tsx'),
      join('admin', 'overview', 'page.tsx'),
      join('admin', 'refills-queue', 'page.tsx'),
    ];
    for (const page of routePages) {
      expect(existsSync(join(CONSOLE_GROUP, page)), `missing ${page}`).toBe(true);
    }
  });

  it('has no leftover top-level /projects or /api-keys route now that both moved under /accounts/[accountId]/*', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'projects'))).toBe(false);
    expect(existsSync(join(CONSOLE_GROUP, 'api-keys'))).toBe(false);
  });

  // ADR 0013's same-day "the admin area" amendment: `/admin` is a real route AGAIN, now an area
  // (`/admin/overview`, `/admin/refills-queue` — the latter moved a second time, out of
  // `/settings/refills-queue`), not the single flat screen IA v3 phase 2 deleted. The one-screen
  // `/admin` this test used to guard against reviving is gone for good; what exists today is a
  // deliberately different shape, and `/settings/refills-queue` no longer exists at all.
  it('gives /admin a real overview + refills-queue area, not a leftover from the pre-IA-v3 flat route', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'admin', 'overview', 'page.tsx'))).toBe(true);
    expect(existsSync(join(CONSOLE_GROUP, 'admin', 'refills-queue', 'page.tsx'))).toBe(true);
    expect(existsSync(join(CONSOLE_GROUP, 'settings', 'refills-queue'))).toBe(false);
  });

  it('has no leftover /settings/account or /settings/projects route now that both folded into /settings/policies', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'settings', 'account'))).toBe(false);
    expect(existsSync(join(CONSOLE_GROUP, 'settings', 'projects'))).toBe(false);
  });

  it('gives /accounts/[accountId]/* its own guard layout', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'accounts', '[accountId]', 'layout.tsx'))).toBe(true);
  });

  // IA v3 phase E ("the settings/accounts move") — projects/refill moved wholesale off the
  // account area, the same "no leftover route file" guard the phase 1/2 moves above already get.
  it('has no leftover /accounts/[accountId]/projects or /refill route now that both moved to /settings/accounts/[accountId]/*', () => {
    expect(existsSync(join(CONSOLE_GROUP, 'accounts', '[accountId]', 'projects'))).toBe(false);
    expect(existsSync(join(CONSOLE_GROUP, 'accounts', '[accountId]', 'refill'))).toBe(false);
  });

  it('gives /settings/accounts/[accountId]/* its own guard layout too', () => {
    expect(
      existsSync(join(CONSOLE_GROUP, 'settings', 'accounts', '[accountId]', 'layout.tsx'))
    ).toBe(true);
  });
});
