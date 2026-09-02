import { AdminCentre } from '../../../containers/admin-centre';
import { hasPermission, listAdminRepos } from '../../../lib/server/admin';
import { currentClaims } from '../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const claims = await currentClaims();
  const canApprove = hasPermission(claims, 'repo:approve');
  const canDeny = hasPermission(claims, 'repo:deny');

  if (!canApprove && !canDeny) {
    return <AdminCentre result={null} canApprove={canApprove} canDeny={canDeny} />;
  }

  const result = await listAdminRepos();
  return <AdminCentre result={result} canApprove={canApprove} canDeny={canDeny} />;
}
