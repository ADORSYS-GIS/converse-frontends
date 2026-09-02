import { notFound } from 'next/navigation';

import { AdminUsageChannelCentre } from '../../../../../../containers/admin-usage-channel-centre';
import { findPage } from '../../../../../../dashboards/dashboard-spec';
import { loadDashboards } from '../../../../../../dashboards/load-dashboards';
import { ADMIN_USAGE_CHANNEL_ROUTE } from '../../../../../../dashboards/usage-routes';
import { can } from '../../../../../../server/access';
import { readSession } from '../../../../../../server/session-store';
import { PERMISSION } from '../../../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/usage/channels/[channelId]` — one OAuth client's usage (converse-frontends#449, C6).
 *
 * Gated **server-side** on `usage:read-all` (converse-frontends#452), `notFound()` for anyone
 * else, exactly as every other `/admin/*` route is. Every query this page issues is `scope: 'all'`
 * narrowed by an `azp` filter, which the backend gates on that same permission and
 * `server/usage-scope-guard.ts` re-checks on the way out.
 *
 * There is no id validation to do here, and none is invented: an `azp` is an opaque OAuth client
 * id with no closed vocabulary to check against, so an unknown one renders a page whose panels all
 * say "no usage in this window" — the honest answer, and the same one a real client with a quiet
 * month gets.
 */
export default async function AdminUsageChannelRoute({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  const { channelId } = await params;
  if (!channelId) {
    notFound();
  }

  const page = findPage(loadDashboards(), ADMIN_USAGE_CHANNEL_ROUTE);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${ADMIN_USAGE_CHANNEL_ROUTE}". The page is ` +
        'defined entirely by that entry, so there is nothing to render — fix the document (or ' +
        'the override mounted at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }

  return <AdminUsageChannelCentre page={page} channelId={channelId} />;
}
