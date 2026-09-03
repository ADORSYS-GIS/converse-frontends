import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/sessions` (converse-frontends#450, story C7) — the SAME server-side permission gate every
 * other `/admin/*` segment carries since converse-frontends#452 (`readSession` + `can(session, …)`
 * + `notFound()`, one permission per destination), asserted the same way they are.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a caller without `session:read` before
 * generating any markup. `notFound()` and not a 403, so they do not learn the route exists at all.
 *
 * The UI half is unusually well backed here: `lightbridge-authz` folds `session:read` into the SQL
 * `WHERE` of `querySessions` itself (`Session`'s own `@@allow("read", …)` clause,
 * lightbridge-authz#657), so a forged session could at most enumerate its own rows.
 */
const SESSIONS_SEGMENT = join('src', 'app', '(console)', 'admin', 'sessions', 'page.tsx');

describe('the /admin/sessions permission gate', () => {
  it('decrypts the session and 404s a caller without session:read', () => {
    const source = readFileSync(join(process.cwd(), SESSIONS_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('can(session, PERMISSION.sessionRead)');
    expect(source).toContain('notFound()');
  });

  it('gates on the estate widening, never on the self-service floor', () => {
    // `session:read-own` is what every default role already holds and what `querySessions`' coarse
    // RBAC gate is mapped to — a caller holding only that would reach this screen and see their own
    // two rows, which is not what an operator ledger is for. Naming the floor here would look like
    // a working gate and be one only by accident.
    const permissions = readFileSync(
      join(process.cwd(), 'src', 'shared', 'permissions.ts'),
      'utf8'
    );

    expect(permissions).toContain("sessionRead: 'session:read'");
    expect(permissions).not.toContain("'session:read-own'");
  });

  it('gates the nav row that links to it, cosmetic but must not regress into "shown then 404s"', () => {
    const chrome = readFileSync(join(process.cwd(), 'src', 'client', 'console-chrome.tsx'), 'utf8');

    expect(chrome).toContain("href: '/admin/sessions'");
    // The row and its gate are declared together in `ADMIN_DESTINATIONS`, so neither can be edited
    // without the other, and the filter below is what makes the pairing bite.
    expect(chrome).toContain('permission: PERMISSION.sessionRead');
    expect(chrome).toContain('hasPermission(permissions, destination.permission)');
  });

  it('never leaves the session-detail sheet as a route segment the gate above does not cover', () => {
    // The failure mode this test exists for: row detail re-acquiring its own route segment (a
    // `/admin/sessions/[sessionId]` page, or a revived rail slot) that forgets this gate.
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-sessions-centre.tsx'),
      'utf8'
    );

    expect(centre).toContain('<BottomSheet');
    expect(centre).toContain('<SessionDetailPanel');
    // Never a side drawer, and never tier-gated behind a rail no `/admin/*` route mounts — ADR
    // 0013's locked layout contract. (`portalClassName=` is the tier hook; the prose above the
    // component explains why it is absent, hence matching the ASSIGNMENT, not the word.)
    expect(centre).not.toContain('portalClassName=');
    expect(centre).not.toContain('lg:hidden');
  });
});
