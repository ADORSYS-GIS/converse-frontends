import { notFound } from 'next/navigation';

import { AdminRefillPoliciesCentre } from '../../../../containers/admin-refill-policies-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/refill-policies` — moved off `/settings/refill-options` (owner ruling, verbatim: "Refill
 * options are for admins only. Not normal users. And we don't 'Simulate' them on the same page
 * where we create them. /admin/refill-policies should be for listing them
 * /admin/refill-policies?create=true or /admin/refill-policies?edit=<id> to create or edit,
 * respectively, /admin/refill-policies?simulate=<id> to simulate." — converse-frontends#368).
 *
 * Gated **server-side** on **`budget:policy-write`** — the permission that actually decides
 * whether this screen's central act (authoring a revision) can succeed — read from the permission
 * set `getMyAccess` resolved into the decrypted session cookie, before any markup is generated
 * (converse-frontends#452 replaced the `lightbridge-admin` role check that used to sit here;
 * `admin-refill-policies-route-gate.test.ts` covers this route and its `create` sibling).
 * `notFound()` rather than a 403: a caller without it should not learn this route exists at all,
 * and the chrome already omits the admin area's own "Refill policies" nav row for them. This is
 * still only the UI half — every procedure the screen calls is independently gated server-side
 * (`budget:policy-read`/`-write`/`-activate`/`-simulate`), so a forged session could at most render
 * an empty/degraded screen.
 *
 * `AdminRefillPoliciesCentre` renders list/edit/simulate inline off nuqs params. **`create` moved
 * OFF this route entirely** (owner review round 2, 2026-08-31, converse-frontends#368 finding #4)
 * — it is its own sibling route segment now, `admin/refill-policies/create/page.tsx`, gated the
 * identical server-side way.
 */
export default async function AdminRefillPoliciesRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.budgetPolicyWrite)) {
    notFound();
  }
  return <AdminRefillPoliciesCentre />;
}
