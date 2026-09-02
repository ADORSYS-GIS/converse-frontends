import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';
import { dashboardPage } from '../../../../../dashboards/page-entry';

/** The route this lens's `dashboards.yaml` entry is keyed by. */
export const SETTINGS_OVERVIEW_USER_ROUTE = '/settings/overview/user';

/**
 * `/settings/overview/user` — the signed-in identity's own usage lens. `force-dynamic` is inherited
 * from `settings/layout.tsx`.
 *
 * `scope: user` is the one usage scope the backend allows ONLY for the caller's own validated
 * token subject — no admin bypass, no user picker — so this lens's `$sub` placeholder can never
 * resolve to anyone else's id.
 */
export default function SettingsOverviewUserRoute() {
  return <SettingsOverviewCentre lens="user" page={dashboardPage(SETTINGS_OVERVIEW_USER_ROUTE)} />;
}
