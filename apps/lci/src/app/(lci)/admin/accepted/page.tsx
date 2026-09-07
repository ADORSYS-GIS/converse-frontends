import { AdminCentre } from '../../../../containers/admin-centre';
import { hasPermission, listAdminRepos } from '../../../../lib/server/admin';
import { currentClaims } from '../../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function AdminAcceptedPage() {
  const claims = await currentClaims();
  const canApprove = hasPermission(claims, 'repo:approve');
  const canDeny = hasPermission(claims, 'repo:deny');

  if (!canApprove && !canDeny) {
    return (
      <AdminCentre
        title="Accepted"
        emptyMessage="No accepted repositories."
        result={null}
        canApprove={canApprove}
        canDeny={canDeny}
      />
    );
  }

  const result = await listAdminRepos('approved');
  return (
    <AdminCentre
      title="Accepted"
      emptyMessage="No accepted repositories."
      result={result}
      canApprove={canApprove}
      canDeny={canDeny}
    />
  );
}
