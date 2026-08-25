import { notFound } from 'next/navigation';

import { AdminSubNav } from '../../../../containers/admin-sub-nav';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/** Same server-side role gate as the Admin centre and rail — each slot is its own segment. */
export default async function AdminScopeRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminSubNav />;
}
