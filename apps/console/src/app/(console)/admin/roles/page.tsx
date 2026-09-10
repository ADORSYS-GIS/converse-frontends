import { notFound } from 'next/navigation';

import { AdminRolesCentre } from '../../../../containers/admin-roles-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/roles` — the platform-role grant directory (converse-frontends#452, story C9).
 *
 * Gated **server-side** on **`rbac:manage`**, the permission `lightbridge-authz` enforces on all
 * four of this screen's procedures (`listPlatformRoleGrants`, `grantPlatformRole`,
 * `revokePlatformRole`, and `searchUsers`' own `user:read`, which `rbac:manage` holders carry),
 * read from the permission set `getMyAccess` resolved into the decrypted session cookie — before
 * any markup is generated. `notFound()` rather than a 403, the same contract every other
 * `/admin/*` segment follows: a caller without the permission should not learn the route exists,
 * and the chrome already omits both nav rows that point here.
 *
 * This is the screen that ENDS the console's role-derived authorization. The route it replaces
 * conceptually — the settings area's `disabled` "Roles" row, captioned "no read API exists
 * (lightbridge-authz#571)" — was honest while it was true; `platform_role_grants` and its
 * procedures (lightbridge-authz#656) made it false, so the row is live and points here.
 *
 * Deployment order matters and is not this route's to enforce: **A2 → A5 → B3 → B1**. Until
 * ai-helm-values B1 flips the prod claim mapper, production still maps `owner → lightbridge-admin`
 * and every signed-in person still holds `rbac:manage`. With this merged, the change a viewer-only
 * user sees is simply that no admin area appears for them at all.
 */
export default async function AdminRolesRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.rbacManage)) {
    notFound();
  }
  return <AdminRolesCentre />;
}
