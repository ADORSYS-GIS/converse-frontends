import { notFound } from 'next/navigation';

import { AdminOverviewCentre } from '../../../../containers/admin-overview-centre';
import { findPage } from '../../../../dashboards/dashboard-spec';
import { loadDashboards } from '../../../../dashboards/load-dashboards';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/** The route this page's `dashboards.yaml` entry is keyed by — the same string the App Router
 *  uses, stated once so the lookup and the YAML cannot drift apart silently. */
export const ADMIN_OVERVIEW_ROUTE = '/admin/overview';

/**
 * `/admin/overview` — the operator dashboard (converse-frontends#368, the admin-area build;
 * migrated onto the declarative engine by #447).
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any dashboard markup is generated — byte-for-byte the same mechanism
 * `settings/refills-queue/page.tsx` already uses (`admin-route-gate.test.ts` covers both routes).
 * `notFound()` rather than a 403: a non-admin should not learn this route exists at all, and the
 * console-ui contract already hides the account-area Operator group's own entry into it for them.
 * This is still only the UI half — every procedure the screen's own queries call is independently
 * gated server-side (`budget:read`, `budget:review`, `usage:read-all`), so a forged session could
 * at most render an empty/degraded dashboard.
 *
 * **The panel list is read HERE, not in the client component.** `loadDashboards()` is `node:fs`
 * (it prefers `${CONSOLE_CONFIG_DIR}/dashboards.yaml` so a deployment can add or remove a panel
 * without a rebuild — owner ruling Q11), and it is fail-loud by contract: an invalid document
 * throws with the offending page and panel id named rather than rendering an empty dashboard. A
 * MISSING entry is the same class of failure and gets the same treatment — never a blank page.
 */
export default async function AdminOverviewRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }

  const page = findPage(loadDashboards(), ADMIN_OVERVIEW_ROUTE);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${ADMIN_OVERVIEW_ROUTE}". The page is defined ` +
        'entirely by that entry, so there is nothing to render — fix the document (or the ' +
        'override mounted at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }

  return <AdminOverviewCentre page={page} />;
}
