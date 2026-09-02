import { notFound } from 'next/navigation';

import { RefillsQueueCentre } from '../../../../containers/refills-queue-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/refills-queue` — gated **server-side** on **`budget:review`**, the exact permission
 * `lightbridge-authz` enforces on `approveAugmentationRequest`/`rejectAugmentationRequest`, read
 * from the permission set `getMyAccess` resolved into the decrypted session cookie, before any
 * refill-queue markup is generated (converse-frontends#452 replaced the `lightbridge-admin` role
 * check that used to sit here). This route has moved
 * twice now: `/admin` (pre-IA-v3) -> `/settings/refills-queue` (IA v3 phase 2, `git mv`) ->
 * `/admin/refills-queue` here (ADR 0013's same-day "the admin area" amendment, another `git mv`,
 * middleware 308s the old `/settings/refills-queue` path) — the gate below is kept byte-for-byte
 * across both moves (`admin-refills-queue-route-gate.test.ts` is the regression guard for it).
 * It now sits alongside `/admin/overview`, the eight-board operator dashboard, as the admin area's
 * second and only other destination.
 *
 * `notFound()` rather than a 403: a caller without `budget:review` should not learn that this
 * route exists at all, and the chrome already omits the admin area's own "Refills queue" nav row
 * for them. This is still only the UI half — `lightbridge-authz` enforces `budget:review` on every
 * procedure the screen calls, so a forged session could at most render an empty queue.
 *
 * `RefillsQueueCentre` renders its review detail as a `BottomSheet` inline, as an ordinary
 * component call inside this already-gated tree — never a sibling route segment that could bypass
 * this gate.
 */
export default async function RefillsQueueRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.budgetReview)) {
    notFound();
  }
  return <RefillsQueueCentre />;
}
