import { notFound } from 'next/navigation';

import { AdminOverviewCentre } from '../../../../containers/admin-overview-centre';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build:
 * "Since I'm an admin, I should also have a block /admin for admin stuffs..."). The eight-board
 * page story (`Pages/AdminOverview`, `claude/sb-admin-dashboards`@aaf3fe6) was approved verbatim
 * ("Approved, build the /admin area.") — `AdminOverviewCentre` composes it against real data.
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any dashboard markup is generated — byte-for-byte the same mechanism
 * `settings/refills-queue/page.tsx` already uses (`admin-route-gate.test.ts` covers both routes).
 * `notFound()` rather than a 403: a non-admin should not learn this route exists at all, and the
 * console-ui contract already hides the account-area Operator group's own entry into it for them.
 * This is still only the UI half — every procedure the screen's own queries call is independently
 * gated server-side (`budget:read`, `budget:review`, …), so a forged session could at most render
 * an empty/degraded dashboard.
 */
export default async function AdminOverviewRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminOverviewCentre />;
}
