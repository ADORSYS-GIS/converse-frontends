import { SettingsSubNav } from '../../../../containers/settings-sub-nav';

export const dynamic = 'force-dynamic';

/** `/settings` — the left rail's secondary section: the SETTINGS sub-nav with its project count. */
export default function SettingsScopeRoute() {
  return <SettingsSubNav />;
}
