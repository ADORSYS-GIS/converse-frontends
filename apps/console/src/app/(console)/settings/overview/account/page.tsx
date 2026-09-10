import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';
import { dashboardPage } from '../../../../../dashboards/page-entry';

/** The route this lens's `dashboards.yaml` entry is keyed by. */
export const SETTINGS_OVERVIEW_ACCOUNT_ROUTE = '/settings/overview/account';

/**
 * `/settings/overview/account` — the account analytics lens. `force-dynamic` is inherited from
 * `settings/layout.tsx`.
 *
 * A thin wrapper around the shared composition: the lens differs from its siblings only in its own
 * `dashboards.yaml` entry (scope + breakdown dimensions) and in which hand-written budget zone
 * renders beside the grid — see `settings-overview-centre.tsx`.
 */
export default async function SettingsOverviewAccountRoute() {
  return (
    <SettingsOverviewCentre
      lens="account"
      page={await dashboardPage(SETTINGS_OVERVIEW_ACCOUNT_ROUTE)}
    />
  );
}
