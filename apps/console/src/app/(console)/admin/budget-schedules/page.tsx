import { notFound } from 'next/navigation';

import { AdminBudgetSchedulesCentre } from '../../../../containers/admin-budget-schedules-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/budget-schedules` — the budget reset schedules list (converse-frontends#451, story C8;
 * backend ADR-0032, lightbridge-authz#653).
 *
 * Gated **server-side** on **`budget:schedule-manage`** read from the permission set `getMyAccess`
 * resolved into the decrypted session cookie, before any markup is generated — byte-for-byte the
 * same mechanism every other `/admin/*` route uses. `notFound()` rather than a 403: a caller
 * without the permission should not learn this route exists at all, and the admin area's own
 * "Budget schedules" nav row is hidden from them by the same permission.
 *
 * This is still only the UI half. Every procedure the screen calls is independently gated
 * server-side at `budget:schedule-manage` (`authz.cstack`'s `@allow` on all five schedule
 * procedures), so a forged session could at most render an empty/degraded screen — it could not
 * author a schedule, let alone fire one.
 *
 * C9 (converse-frontends#452) did exactly what this comment anticipated: the `isAdmin` helper is
 * deleted, and this route now names the permission its own five procedures already enforce
 * server-side rather than a role that happened to carry it.
 */
export default async function AdminBudgetSchedulesRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.budgetScheduleManage)) {
    notFound();
  }
  return <AdminBudgetSchedulesCentre />;
}
