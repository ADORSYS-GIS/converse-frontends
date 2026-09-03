import { notFound } from 'next/navigation';

import { AdminUsageCentre } from '../../../../containers/admin-usage-centre';
import { ADMIN_USAGE_ROUTE } from '../../../../dashboards/usage-routes';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';
import { dashboardPage } from '../../../../dashboards/page-entry';

export const dynamic = 'force-dynamic';

/** The route this page's `dashboards.yaml` entry is keyed by — the same string the App Router
 *  uses. It moved to `dashboards/usage-routes.ts` with story C6, which added three sibling routes
 *  and the href builders that link into them: one module now states the area's whole route
 *  vocabulary, so a link template and the page it lands on cannot drift apart. */
export { ADMIN_USAGE_ROUTE };

/**
 * `/admin/usage` — the estate's usage surface (converse-frontends#448, story C5).
 *
 * Gated **server-side** on **`usage:read-all`** read from the permission set `getMyAccess`
 * resolved into the decrypted session cookie, before any dashboard markup is generated —
 * byte-for-byte the mechanism every other `/admin/*` route already uses (converse-frontends#452
 * replaced the `lightbridge-admin` role check that used to sit here; `admin-usage-route-gate.test.ts`
 * covers it). `notFound()` rather than a 403: a caller without the permission should not learn this
 * route exists. That is still only the UI half — every
 * query the screen issues is `scope: 'all'`, which the usage backend independently gates on
 * `usage:read-all`, and the console's own proxy re-checks it in `server/usage-scope-guard.ts`. A
 * forged session could at most render an empty dashboard.
 *
 * **The panel list is read HERE, not in the client component.** `loadDashboards()` is `node:fs`
 * (it prefers `${CONSOLE_CONFIG_DIR}/dashboards.yaml` so a deployment can add or remove a panel
 * without a rebuild — owner ruling Q11), and it is fail-loud by contract: an invalid document
 * throws with the offending page and panel id named rather than rendering an empty dashboard. A
 * MISSING entry is the same class of failure and gets the same treatment — this page IS its YAML
 * entry, so there is nothing to fall back to and nothing worth pretending.
 */
export default async function AdminUsageRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  // Read AND translated by the shared helper (ADR 0017): `dashboards.yaml` carries i18n
  // keys, and `dashboardPage` resolves them against this request's own locale before the
  // spec reaches a client component. It is also fail-loud on a missing entry, which is
  // exactly the throw four routes used to carry a hand-copied version of.
  const page = await dashboardPage(ADMIN_USAGE_ROUTE);

  return <AdminUsageCentre page={page} />;
}
