import { OverviewCentre } from '../../../../../containers/overview-centre';
import { dashboardPage } from '../../../../../dashboards/page-entry';

export const dynamic = 'force-dynamic';

/** The route this page's `dashboards.yaml` entry is keyed by — the same string the App Router
 *  uses, stated once so the lookup and the YAML cannot drift apart silently. */
export const ACCOUNT_OVERVIEW_ROUTE = '/accounts/[accountId]/overview';

/**
 * `/accounts/[accountId]/overview` — the account-scoped user dashboard. The shell around it is
 * mounted once by `(console)/layout.tsx`.
 *
 * **The panel list is read HERE, not in the client component** (converse-frontends#455, story
 * C12): `dashboardPage()` is `node:fs` (it prefers `${CONSOLE_CONFIG_DIR}/dashboards.yaml` so a
 * deployment can add or remove a panel without a rebuild — owner ruling Q11) and fail-loud by
 * contract.
 */
export default function OverviewRoute() {
  return <OverviewCentre page={dashboardPage(ACCOUNT_OVERVIEW_ROUTE)} />;
}
