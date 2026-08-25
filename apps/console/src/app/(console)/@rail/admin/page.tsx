import { notFound } from 'next/navigation';

import { AdminRail } from '../../../../containers/admin-rail';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * The Admin rail carries the same server-side role gate as the Admin centre: a parallel-route
 * slot is its own route segment, so a `notFound()` in the sibling `children` segment does not by
 * itself stop this one from rendering.
 */
export default async function AdminRailRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminRail />;
}
