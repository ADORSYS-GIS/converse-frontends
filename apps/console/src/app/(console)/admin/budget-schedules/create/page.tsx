import { notFound } from 'next/navigation';

import { AdminBudgetScheduleCreateCentre } from '../../../../../containers/admin-budget-schedule-create-centre';
import { can } from '../../../../../server/access';
import { readSession } from '../../../../../server/session-store';
import { PERMISSION } from '../../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/budget-schedules/create` (converse-frontends#451, story C8) — its own route segment
 * rather than a `?create=true` param on the list, mirroring the owner's round-2 ruling for
 * `/admin/refill-policies/create` (2026-08-31, converse-frontends#368 finding #4).
 *
 * Gated **server-side** the identical way its sibling one segment up is — see that file's own doc
 * comment. `createBudgetResetSchedule` is independently gated at `budget:schedule-manage`, and it
 * creates every schedule DISABLED (the input carries no `enabled` field at all), so even a forged
 * session that reached this form could not author a rule that fires.
 */
export default async function AdminBudgetScheduleCreateRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.budgetScheduleManage)) {
    notFound();
  }
  return <AdminBudgetScheduleCreateCentre />;
}
