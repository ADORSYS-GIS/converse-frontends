import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';
import { dashboardPage } from '../../../../../dashboards/page-entry';

/** The route this lens's `dashboards.yaml` entry is keyed by. */
export const SETTINGS_OVERVIEW_PROJECT_ROUTE = '/settings/overview/project';

/**
 * `/settings/overview/project` — the project-scoped analytics lens. `force-dynamic` is inherited
 * from `settings/layout.tsx`. See `/settings/overview/account`'s own doc comment.
 */
export default function SettingsOverviewProjectRoute() {
  return (
    <SettingsOverviewCentre lens="project" page={dashboardPage(SETTINGS_OVERVIEW_PROJECT_ROUTE)} />
  );
}
