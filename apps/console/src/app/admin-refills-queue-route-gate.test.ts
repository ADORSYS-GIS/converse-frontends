import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/admin/refills-queue` has moved twice now: `/admin` (pre-IA-v3) -> `/settings/refills-queue`
 * (IA v3 phase 2, `git mv`) -> `/admin/refills-queue` here (ADR 0013's same-day "the admin area"
 * amendment, another `git mv`), keeping the server-side role gate byte-for-byte across both moves.
 * This file replaces `settings-route-gate.test.ts` (same rename, same reasoning) and asserts the
 * SAME properties against the current path.
 *
 * `RefillsQueueCentre` renders its review detail as a `BottomSheet` (`components/bottom-sheet`,
 * at every tier — neither `/admin/*` nor `/settings/*` has a right rail at any tier), still an
 * ordinary component call inside the already-gated `refills-queue/page.tsx` tree, not a sibling
 * route segment that could bypass the gate on its own.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any
 * refill-queue markup. `notFound()` and not a 403, so a non-admin does not learn the route exists
 * at all. This is still only the UI half — `lightbridge-authz` enforces the real permission on
 * every procedure regardless.
 */
const REFILLS_QUEUE_SEGMENT = join('src', 'app', '(console)', 'admin', 'refills-queue', 'page.tsx');

describe('the /admin/refills-queue role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), REFILLS_QUEUE_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('isAdmin(session.user.roles)');
    expect(source).toContain('notFound()');
  });

  it('gates both nav surfaces that link to it, cosmetic but must not regress into "shown then 404s"', () => {
    // Neither nav row stays visible for a non-admin — cosmetic, but it must not regress into
    // "shown and then 404s", which advertises the route to everyone. `navGroups`' own `isAdmin`
    // param gates the account-area Operator group's "Refill requests" row (into `/admin/overview`);
    // `adminNavGroups` is only ever called once the caller has already checked `session.isAdmin`
    // (`ConsoleSidebarContent`'s own branch) — both fed from the session by
    // `client/console-chrome.tsx`'s callers.
    const chrome = readFileSync(
      join(process.cwd(), 'src', 'client', 'console-chrome.tsx'),
      'utf8'
    );

    expect(chrome).toContain('isAdmin: boolean');
    expect(chrome).toContain('export function adminNavGroups');
  });

  it('never leaves the review-detail sheet as a route segment the gate above does not cover', () => {
    // Guards the failure mode this file exists for: the review detail re-acquiring its own route
    // segment (a revived rail slot, or a nested route) that forgets the gate this test covers.
    const centre = readFileSync(
      join(process.cwd(), 'src', 'containers', 'refills-queue-centre.tsx'),
      'utf8'
    );

    expect(centre).toContain('<BottomSheet');
    expect(centre).toContain('<ReviewDetailPanel');
    // Phase 2: the sheet is the review surface at every tier now — no `lg:hidden` gate handing
    // off to a rail that no longer exists on `/admin/*` or `/settings/*`.
    expect(centre).not.toContain('lg:hidden');
  });

  it('308s the old /settings/refills-queue path to the new one, verbatim query params included', () => {
    const middleware = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8');

    expect(middleware).toContain("'/settings/refills-queue'");
    expect(middleware).toContain('/admin/refills-queue');
  });
});
