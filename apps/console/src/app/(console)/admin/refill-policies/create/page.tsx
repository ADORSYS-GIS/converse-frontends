import { notFound } from 'next/navigation';

import { AdminRefillPolicyCreateCentre } from '../../../../../containers/admin-refill-policy-create-centre';
import { readSession } from '../../../../../server/session-store';
import { isAdmin } from '../../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin/refill-policies/create` — owner review round 2 (2026-08-31, converse-frontends#368
 * finding #4, verbatim): "You made out of /admin/refill-policies?create=true a full page.
 * Instead, I was thinking of a modal. But it's fine. Just move it to a page
 * /admin/refill-policies/create." A bookmarked/linked `?create=true` still lands here —
 * `middleware.ts`'s own redirect table.
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any markup is generated — byte-for-byte the same mechanism `admin/refill-policies/
 * page.tsx` (its sibling, one segment up) and every other `/admin/*` route already use
 * (`admin-refill-policies-route-gate.test.ts` covers both routes the same way). `notFound()`
 * rather than a 403: a non-admin should not learn this route exists at all. This is still only the
 * UI half — `activateBudgetPolicy`/`createBudgetPolicyRevision` are independently gated
 * server-side, so a forged session could at most render an empty/degraded screen.
 */
export default async function AdminRefillPolicyCreateRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminRefillPolicyCreateCentre />;
}
