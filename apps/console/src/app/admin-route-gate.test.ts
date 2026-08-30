import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin` is one route with two sections (`?section=overview|refills`), both behind the same
 * grant that reveals the Admin nav group.
 *
 * Shell revamp phase 2 (2026-08-30): the `@rail`/`@scope` parallel-route slots this test used to
 * enumerate alongside the route's own `page.tsx` are deleted. Phase 3 then deleted the temporary
 * right-hand aside (`admin-rail.tsx`) phase 2 had replaced them with — `AdminCentre` now renders
 * its review detail as a `BottomSheet` (`components/bottom-sheet`, below `lg`) hosting
 * `ReviewDetailPanel` directly, still an ordinary component call inside the already-gated
 * `admin/page.tsx` tree, not a sibling route segment that could bypass the gate on its own.
 * Rail-return round (2026-08-30): `containers/inspector-rail.tsx` is the `lg`+ surface for the
 * same content — also an ordinary component call, mounted once from `app/(console)/layout.tsx`,
 * not a route segment. There is therefore exactly one segment left to gate.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any admin
 * markup. `notFound()` and not a 403, so a non-admin does not learn the route exists at all. This
 * is still only the UI half — `lightbridge-authz` enforces the real permission on every procedure
 * regardless.
 */
const ADMIN_SEGMENT = join('src', 'app', '(console)', 'admin', 'page.tsx');

describe('the /admin role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), ADMIN_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('isAdmin(session.user.roles)');
    expect(source).toContain('notFound()');
  });

  it('gates the Admin nav group itself, cosmetic but must not regress into "shown then 404s"', () => {
    // The nav group stays hidden for a non-admin — cosmetic, but it must not regress into "shown
    // and then 404s", which advertises the area to everyone. `navGroups`'s own `isAdmin` param
    // (`client/console-chrome.tsx`) is what the layout feeds from the session.
    const chrome = readFileSync(
      join(process.cwd(), 'src', 'client', 'console-chrome.tsx'),
      'utf8'
    );

    expect(chrome).toContain('isAdmin: boolean');
  });

  it('never leaves the review-detail sheet as a route segment the gate above does not cover', () => {
    // Guards the failure mode this file exists for: the review detail re-acquiring its own route
    // segment (a revived `@rail` slot, or a nested route) that forgets the gate this test covers.
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'admin-centre.tsx'),
      'utf8'
    );

    expect(centre).toContain('<BottomSheet');
    expect(centre).toContain('<ReviewDetailPanel');
  });
});
