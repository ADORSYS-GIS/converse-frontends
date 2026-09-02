import { notFound } from 'next/navigation';

import { AdminUsageCentre } from '../../../../containers/admin-usage-centre';
import { findPage } from '../../../../dashboards/dashboard-spec';
import { loadDashboards } from '../../../../dashboards/load-dashboards';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/** The route this page's `dashboards.yaml` entry is keyed by — the same string the App Router
 *  uses, stated once so the lookup and the YAML cannot drift apart silently. */
export const ADMIN_USAGE_ROUTE = '/admin/usage';

/**
 * `/admin/usage` — the estate's usage surface (converse-frontends#448, story C5).
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any dashboard markup is generated — byte-for-byte the mechanism every other `/admin/*`
 * route already uses (`admin-route-gate.test.ts` covers them together). `notFound()` rather than a
 * 403: a non-admin should not learn this route exists. That is still only the UI half — every
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
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }

  const page = findPage(loadDashboards(), ADMIN_USAGE_ROUTE);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${ADMIN_USAGE_ROUTE}". The page is defined ` +
        'entirely by that entry, so there is nothing to render — fix the document (or the ' +
        'override mounted at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }

  return <AdminUsageCentre page={page} />;
}
