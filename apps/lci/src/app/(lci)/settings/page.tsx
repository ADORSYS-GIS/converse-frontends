import { SettingsCentre } from '../../../containers/settings-centre';
import { permissions } from '../../../lib/server/admin';
import { currentClaims } from '../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const claims = await currentClaims();
  return <SettingsCentre claims={claims} perms={permissions(claims)} />;
}
