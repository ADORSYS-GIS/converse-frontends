import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';

/**
 * `/settings/overview/project` — the project-scoped analytics lens (IA v3 phase 4). `force-dynamic`
 * is inherited from `settings/layout.tsx`. See `/settings/overview/account`'s own doc comment.
 */
export default function SettingsOverviewProjectRoute() {
  return <SettingsOverviewCentre lens="project" />;
}
