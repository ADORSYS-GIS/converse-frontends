import { notFound } from 'next/navigation';

import { AdminRefillPoliciesCentre } from '../../../../containers/admin-refill-policies-centre';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin/refill-policies` — moved off `/settings/refill-options` (owner ruling, verbatim: "Refill
 * options are for admins only. Not normal users. And we don't 'Simulate' them on the same page
 * where we create them. /admin/refill-policies should be for listing them
 * /admin/refill-policies?create=true or /admin/refill-policies?edit=<id> to create or edit,
 * respectively, /admin/refill-policies?simulate=<id> to simulate." — converse-frontends#368).
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any markup is generated — byte-for-byte the same mechanism `admin/overview/page.tsx` and
 * `admin/refills-queue/page.tsx` already use (`admin-refill-policies-route-gate.test.ts` covers
 * this route the same way). `notFound()` rather than a 403: a non-admin should not learn this
 * route exists at all, and the console-ui contract already hides both the settings-area entry
 * (deleted) and the admin area's own "Refill policies" nav row for them. This is still only the
 * UI half — every procedure the screen calls is independently gated server-side
 * (`budget:policy-read`/`-write`/`-activate`/`-simulate`), so a forged session could at most render
 * an empty/degraded screen.
 *
 * `AdminRefillPoliciesCentre` renders all four modes (list/create/edit/simulate) inline off nuqs
 * params — never a sibling route segment that could bypass this gate.
 */
export default async function AdminRefillPoliciesRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminRefillPoliciesCentre />;
}
