import { SettingsOverviewCentre } from '../../../../../containers/settings-overview-centre';

/**
 * `/settings/overview/user` — the signed-in identity's own usage lens (IA v3 phase 4).
 * `force-dynamic` is inherited from `settings/layout.tsx`. See `/settings/overview/account`'s own
 * doc comment.
 */
export default function SettingsOverviewUserRoute() {
  return <SettingsOverviewCentre lens="user" />;
}
