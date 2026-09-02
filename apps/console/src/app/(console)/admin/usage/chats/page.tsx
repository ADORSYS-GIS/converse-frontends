import { notFound } from 'next/navigation';

import { AdminUsageChatsCentre } from '../../../../../containers/admin-usage-chats-centre';
import { findPage } from '../../../../../dashboards/dashboard-spec';
import { loadDashboards } from '../../../../../dashboards/load-dashboards';
import { ADMIN_USAGE_CHATS_ROUTE } from '../../../../../dashboards/usage-routes';
import { can } from '../../../../../server/access';
import { readSession } from '../../../../../server/session-store';
import { PERMISSION } from '../../../../../shared/permissions';

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

  const page = findPage(loadDashboards(), ADMIN_USAGE_CHATS_ROUTE);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${ADMIN_USAGE_CHATS_ROUTE}". The page is ` +
        'defined entirely by that entry, so there is nothing to render — fix the document (or ' +
        'the override mounted at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }

  return <AdminUsageChatsCentre page={page} />;
}
