import { notFound } from 'next/navigation';

import { AdminUsageActorCentre } from '../../../../../../containers/admin-usage-actor-centre';
import { findPage } from '../../../../../../dashboards/dashboard-spec';
import { loadDashboards } from '../../../../../../dashboards/load-dashboards';
import {
  ADMIN_USAGE_ACTOR_ROUTE,
  isAdminUsageActorType,
} from '../../../../../../dashboards/usage-routes';
import { can } from '../../../../../../server/access';
import { readSession } from '../../../../../../server/session-store';
import { PERMISSION } from '../../../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/usage/actors/[actorId]?type=user|account|project` — one actor's usage
 * (converse-frontends#449, story C6).
 *
 * Gated **server-side** on `usage:read-all`, read from the permission set `getMyAccess` resolved
 * into the decrypted session cookie (converse-frontends#452) — byte-for-byte the mechanism every
 * other `/admin/*` route uses. `notFound()` rather than a 403: a caller without the permission
 * should not learn this route exists. That is still only the UI half — every query this page
 * issues names a `scope_id` the caller did not have to own, which is exactly what the backend
 * gates on the SAME permission, and what `server/usage-scope-guard.ts` re-checks on the way out.
 *
 * **`?type=` is validated HERE, and an invalid one is a 404.** It is substituted straight into the
 * panels' `scope`, which is a closed enum deciding whose data comes back: a typo must not reach
 * the backend as a 400 arriving under a page that has already printed an actor's name. The engine
 * checks the substituted value a second time (`assertUsageScope`), so the YAML is safe to read on
 * its own; this check is what turns the failure into the right HTTP answer.
 *
 * **An unresolvable actor id is NOT a 404.** An id with real usage rows renders in full under a
 * labelled sentinel header (an explicit AC): nothing here can tell "this id does not exist" from
 * "this id has no profile row", and the spend figures are the reading either way.
 */
export default async function AdminUsageActorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ actorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.usageReadAll)) {
    notFound();
  }

  const { actorId } = await params;
  const query = await searchParams;
  const rawType = Array.isArray(query.type) ? query.type[0] : query.type;

  // Missing and unrecognised are the same answer on purpose: both mean "this URL does not name a
  // page", and distinguishing them would only tell a caller which half they got wrong.
  if (!actorId || !isAdminUsageActorType(rawType)) {
    notFound();
  }

  const page = findPage(loadDashboards(), ADMIN_USAGE_ACTOR_ROUTE);
  if (!page) {
    throw new Error(
      `[console] dashboards.yaml has no entry for "${ADMIN_USAGE_ACTOR_ROUTE}". The page is ` +
        'defined entirely by that entry, so there is nothing to render — fix the document (or ' +
        'the override mounted at CONSOLE_CONFIG_DIR) rather than shipping an empty dashboard.'
    );
  }

  return <AdminUsageActorCentre page={page} actorId={actorId} type={rawType} />;
}
