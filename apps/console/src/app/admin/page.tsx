import { notFound } from 'next/navigation';

import { AdminContainer } from '../../containers/admin-container';
import { readSession } from '../../server/session-store';
import { isAdmin } from '../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin` — gated **server-side** on the `lightbridge-admin` role read from the decrypted session
 * cookie, before any admin markup is generated.
 *
 * `notFound()` rather than a 403: a non-admin should not learn that this route exists at all, and
 * the console-ui contract already hides the Admin nav group entirely for them. This is still only
 * the UI half — `lightbridge-authz` enforces `budget:review` on every procedure the page calls, so
 * a forged session could at most render an empty queue.
 */
export default async function AdminRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminContainer />;
}
