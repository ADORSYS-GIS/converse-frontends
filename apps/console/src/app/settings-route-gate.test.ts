import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/settings/refills-queue` is the former `/admin` — IA v3 phase 2 ("the settings area") moved it
 * wholesale (`git mv apps/console/src/app/(console)/admin apps/console/src/app/(console)/
 * settings/refills-queue`), keeping the server-side role gate byte-for-byte. This file replaces
 * `admin-route-gate.test.ts` (same rename) and asserts the SAME properties against the new path.
 *
 * `RefillsQueueCentre` renders its review detail as a `BottomSheet` (`components/bottom-sheet`,
 * at every tier now — `/settings/*` has no right rail at any tier, this phase's own deliverable),
 * still an ordinary component call inside the already-gated `refills-queue/page.tsx` tree, not a
 * sibling route segment that could bypass the gate on its own.
 *
 * A source-shape assertion rather than a render test, because the property is about the route
 * SEGMENT: it must decrypt the session and `notFound()` a non-admin before generating any
 * refill-queue markup. `notFound()` and not a 403, so a non-admin does not learn the route exists
 * at all. This is still only the UI half — `lightbridge-authz` enforces the real permission on
 * every procedure regardless.
 */
const REFILLS_QUEUE_SEGMENT = join(
  'src',
  'app',
  '(console)',
  'settings',
  'refills-queue',
  'page.tsx'
);

describe('the /settings/refills-queue role gate', () => {
  it('decrypts the session and 404s a non-admin', () => {
    const source = readFileSync(join(process.cwd(), REFILLS_QUEUE_SEGMENT), 'utf8');

    expect(source).toContain('readSession()');
    expect(source).toContain('isAdmin(session.user.roles)');
    expect(source).toContain('notFound()');
  });

  it('gates both nav surfaces that link to it, cosmetic but must not regress into "shown then 404s"', () => {
    // Neither nav row stays visible for a non-admin — cosmetic, but it must not regress into
    // "shown and then 404s", which advertises the route to everyone. `navGroups`' own `isAdmin`
    // param gates the account-area Operator group's "Refill requests" row; `settingsNavGroups`'
    // own `isAdmin` param gates the settings area's own "Refills queue" row — both fed from the
    // session by `client/console-chrome.tsx`'s callers.
    const chrome = readFileSync(
      join(process.cwd(), 'src', 'client', 'console-chrome.tsx'),
      'utf8'
    );

    expect(chrome).toContain('isAdmin: boolean');
    expect(chrome).toContain('export function settingsNavGroups');
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
    // off to a rail that no longer exists on `/settings/*`.
    expect(centre).not.toContain('lg:hidden');
  });

  it('308s the old /admin path to the new one, verbatim query params included', () => {
    const middleware = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8');

    expect(middleware).toContain("'/admin'");
    expect(middleware).toContain('/settings/refills-queue');
  });
});
