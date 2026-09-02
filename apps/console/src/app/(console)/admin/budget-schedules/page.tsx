import { notFound } from 'next/navigation';

import { AdminBudgetSchedulesCentre } from '../../../../containers/admin-budget-schedules-centre';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin/budget-schedules` — the budget reset schedules list (converse-frontends#451, story C8;
 * backend ADR-0032, lightbridge-authz#653).
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any markup is generated — byte-for-byte the same mechanism every other `/admin/*` route
 * uses. `notFound()` rather than a 403: a non-admin should not learn this route exists at all, and
 * the admin area's own "Budget schedules" nav row is hidden from them for the same reason.
 *
 * This is still only the UI half. Every procedure the screen calls is independently gated
 * server-side at `budget:schedule-manage` (`authz.cstack`'s `@allow` on all five schedule
 * procedures), so a forged session could at most render an empty/degraded screen — it could not
 * author a schedule, let alone fire one.
 *
 * C9 (converse-frontends#452) replaces `isAdmin` here with a `can('budget:schedule-manage')` check
 * against `getMyAccess`, at which point this file's gate becomes the same shape as every other
 * admin route's and the whole `isAdmin` helper is deleted. Until then this route gates exactly the
 * way its siblings do rather than inventing a third, half-migrated pattern.
 */
export default async function AdminBudgetSchedulesRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminBudgetSchedulesCentre />;
}
