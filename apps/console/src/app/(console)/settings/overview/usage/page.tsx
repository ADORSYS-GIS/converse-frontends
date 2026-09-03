import { UsageOverviewCentre } from '../../../../../containers/usage-overview-centre';
import { dashboardPage } from '../../../../../dashboards/page-entry';

/** The route this page's `dashboards.yaml` entry is keyed by. */
export const SETTINGS_OVERVIEW_USAGE_ROUTE = '/settings/overview/usage';

/**
 * `/settings/overview/usage` — the settings area's landing lens (owner directive: the
 * cross-account usage overlay is what "Overview" opens on). `force-dynamic` is inherited from
 * `settings/layout.tsx`.
 *
 * The one page in the console whose panels carry `scope: family` — a fan-out over the signed-in
 * identity's own account family, capped and captioned by the container. See
 * `usage-overview-centre.tsx` for why that is not `scope: all`.
 */
export default async function SettingsOverviewUsageRoute() {
  return <UsageOverviewCentre page={await dashboardPage(SETTINGS_OVERVIEW_USAGE_ROUTE)} />;
}
