import { notFound } from 'next/navigation';

import { AdminUsageChannelCentre } from '../../../../../../containers/admin-usage-channel-centre';
import { ADMIN_USAGE_CHANNEL_ROUTE } from '../../../../../../dashboards/usage-routes';
import { can } from '../../../../../../server/access';
import { readSession } from '../../../../../../server/session-store';
import { PERMISSION } from '../../../../../../shared/permissions';
import { dashboardPage } from '../../../../../../dashboards/page-entry';

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

  // Read AND translated by the shared helper (ADR 0017): `dashboards.yaml` carries i18n
  // keys, and `dashboardPage` resolves them against this request's own locale before the
  // spec reaches a client component. It is also fail-loud on a missing entry, which is
  // exactly the throw four routes used to carry a hand-copied version of.
  const page = await dashboardPage(ADMIN_USAGE_CHANNEL_ROUTE);

  return <AdminUsageChannelCentre page={page} channelId={channelId} />;
}
