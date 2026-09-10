import { notFound } from 'next/navigation';

import { AdminRefillPolicyCreateCentre } from '../../../../../containers/admin-refill-policy-create-centre';
import { can } from '../../../../../server/access';
import { readSession } from '../../../../../server/session-store';
import { PERMISSION } from '../../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/refill-policies/create` — owner review round 2 (2026-08-31, converse-frontends#368
 * finding #4, verbatim): "You made out of /admin/refill-policies?create=true a full page.
 * Instead, I was thinking of a modal. But it's fine. Just move it to a page
 * /admin/refill-policies/create." A bookmarked/linked `?create=true` still lands here —
 * `middleware.ts`'s own redirect table.
 *
 * Gated **server-side** on **`budget:policy-write`** read from the permission set `getMyAccess`
 * resolved into the decrypted session cookie, before any markup is generated — byte-for-byte the
 * same mechanism `admin/refill-policies/page.tsx` (its sibling, one segment up) and every other
 * `/admin/*` route already use, and the same permission, since authoring is exactly what both
 * screens do (converse-frontends#452 replaced the `lightbridge-admin` role check that used to sit
 * here; `admin-refill-policies-route-gate.test.ts` covers both routes the same way). `notFound()`
 * rather than a 403: a caller without it should not learn this route exists at all. This is still only the
 * UI half — `activateBudgetPolicy`/`createBudgetPolicyRevision` are independently gated
 * server-side, so a forged session could at most render an empty/degraded screen.
 */
export default async function AdminRefillPolicyCreateRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.budgetPolicyWrite)) {
    notFound();
  }
  return <AdminRefillPolicyCreateCentre />;
}
