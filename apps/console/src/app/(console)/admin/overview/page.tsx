import { notFound } from 'next/navigation';

import { AdminOverviewCentre } from '../../../../containers/admin-overview-centre';
import { dashboardPage } from '../../../../dashboards/page-entry';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/** The route this page's `dashboards.yaml` entry is keyed by — the same string the App Router
 *  uses, stated once so the lookup and the YAML cannot drift apart silently. */
export const ADMIN_OVERVIEW_ROUTE = '/admin/overview';

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build;
 * migrated onto the declarative engine by #447).
 *
 * Gated **server-side** on **`usage:read-all`** — the permission the backend itself enforces on
 * every `scope: 'all'` query this dashboard's boards fire — read from the permission set
 * `getMyAccess` resolved into the decrypted session cookie, before any dashboard markup is
 * generated (converse-frontends#452 replaced the `lightbridge-admin` role check that used to sit
 * here; `admin-overview-route-gate.test.ts` is the regression guard).
 *
 * `notFound()` rather than a 403: a caller without the permission should not learn this route
 * exists at all, and the chrome already omits every nav row into it for them. This is still only
 * the UI half — every procedure the screen's own queries call is independently gated server-side
 * (`budget:read`, `budget:review`, `usage:read-all`), so a forged session could at most render an
 * empty/degraded dashboard.
 *
 * **The panel list is read HERE, not in the client component.** `dashboardPage()` is `node:fs`
 * (it prefers `${CONSOLE_CONFIG_DIR}/dashboards.yaml` so a deployment can add or remove a panel
 * without a rebuild — owner ruling Q11), and it is fail-loud by contract: an invalid or missing
 * entry throws with the offending page and panel id named rather than rendering a blank page.
 */
export default async function AdminOverviewRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  return <AdminOverviewCentre page={dashboardPage(ADMIN_OVERVIEW_ROUTE)} />;
}
