import { notFound } from 'next/navigation';

import { AdminUsageChatsCentre } from '../../../../../containers/admin-usage-chats-centre';
import { ADMIN_USAGE_CHATS_ROUTE } from '../../../../../dashboards/usage-routes';
import { can } from '../../../../../server/access';
import { readSession } from '../../../../../server/session-store';
import { PERMISSION } from '../../../../../shared/permissions';
import { dashboardPage } from '../../../../../dashboards/page-entry';

export const dynamic = 'force-dynamic';

/**
 * `/admin/usage/chats` — the estate's chat-shaped operations (converse-frontends#449, story C6).
 *
 * Gated **server-side** on `usage:read-all` (converse-frontends#452), `notFound()` for anyone
 * else — the same mechanism every `/admin/*` route uses, and the same permission the backend
 * enforces on the `scope: 'all'` queries this page issues.
 *
 * The panel list is read HERE rather than in the client component: `loadDashboards()` is `node:fs`
 * and prefers the config-volume override (owner ruling Q11). A missing entry throws with the route
 * named rather than rendering an empty dashboard — this page IS its YAML entry.
 */
export default async function AdminUsageChatsRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  // Read AND translated by the shared helper (ADR 0017): `dashboards.yaml` carries i18n
  // keys, and `dashboardPage` resolves them against this request's own locale before the
  // spec reaches a client component. It is also fail-loud on a missing entry, which is
  // exactly the throw four routes used to carry a hand-copied version of.
  const page = await dashboardPage(ADMIN_USAGE_CHATS_ROUTE);

  return <AdminUsageChatsCentre page={page} />;
}
