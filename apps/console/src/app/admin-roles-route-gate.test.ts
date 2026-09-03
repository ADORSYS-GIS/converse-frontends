import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/roles` — the platform-role grant directory (converse-frontends#452, story C9).
 *
 * A source-shape assertion rather than a render test, the same reasoning every other
 * `admin-*-route-gate.test.ts` states: the property under test is about the route SEGMENT — it
 * must decrypt the session and `notFound()` a caller without `rbac:manage` before generating any
 * markup, so a hand-typed URL is refused even though the chrome already omits both rows that point
 * here.
 *
 * This file also pins the negative that the whole story is about: no route segment anywhere may go
 * back to reading a ROLE. `isAdmin`/`ADMIN_ROLE` are deleted (`no-role-derived-gates.test.ts`
 * enforces that repo-wide); this asserts the positive replacement is actually in place on the
 * newest segment, which is the one most likely to be copied when the next admin page is added.
 */
const ADMIN_ROLES_SEGMENT = join('src', 'app', '(console)', 'admin', 'roles', 'page.tsx');

describe('the /admin/roles permission gate', () => {
  it('decrypts the session and 404s a caller without rbac:manage', () => {
    const source = readFileSync(join(process.cwd(), ADMIN_ROLES_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.rbacManage)');
    expect(source).toContain('notFound()');
  });

  it('gates the one nav row that links here, so it is never "shown and then 404s"', () => {
    const chrome = readFileSync(join(process.cwd(), 'src', 'client', 'console-chrome.tsx'), 'utf8');

    // The admin area's own row — the ONLY one now (owner directive, 2026-09-03: "The Roles button
    // in Settings' left rail can safely be removed") — declared beside the permission its
    // destination requires, so `ADMIN_DESTINATIONS`' filter and this segment's own `can()` read
    // the same string and cannot drift.
    expect(chrome).toContain("href: '/admin/roles'");
    expect(chrome).toContain('permission: PERMISSION.rbacManage');
    // The settings rail's second entrance to this same screen is gone, not re-gated: one nav home
    // per destination.
    expect(chrome).not.toContain("key: 'roles',");
    // The disabled placeholder that row once was is gone outright too, not kept as a fallback
    // branch. The constant is asserted absent as a DECLARATION and as a USE — the doc comment
    // above the function still names it, deliberately, to record what was deleted and why.
    expect(chrome).not.toContain('export const ROLES_DISABLED_REASON');
    expect(chrome).not.toContain('reason: ROLES_DISABLED_REASON');
  });

  it('renders its dialogs inside the gated tree, never as sibling route segments', () => {
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-roles-centre.tsx'),
      'utf8'
    );

    // Guards the failure mode every `/admin/*` gate test guards: a mutation surface re-acquiring
    // its own route segment that forgets the check this file covers.
    expect(centre).toContain('<GrantRoleDialog');
    expect(centre).toContain('<RevokeRoleDialog');
  });
});
