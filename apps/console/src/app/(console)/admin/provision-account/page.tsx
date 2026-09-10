import { notFound } from 'next/navigation';

import { AdminProvisionAccountCentre } from '../../../../containers/admin-provision-account-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722) — the console side of the backend's
 * `provisionAccount` RPC procedure: an admin creates a first `accounts` row (plus its mandatory
 * default project) for a Keycloak subject who can never self-provision one, because
 * `authz-idp`'s `/idp/callback` refuses sign-in for a subject with no account at all.
 *
 * Gated **server-side** on **`account:provision`**, read from the permission set `getMyAccess`
 * resolved into the decrypted session cookie, before any markup is generated — the same shape
 * every other `/admin/*` segment carries since converse-frontends#452 replaced the
 * `lightbridge-admin` role check: `readSession` + `can(session, …)` + `notFound()`, one permission
 * per destination (`admin-provision-account-route-gate.test.ts` covers this one the same way
 * `admin-refills-queue-route-gate.test.ts`/`admin-refill-policy-create-route-gate.test.ts` cover
 * theirs). `notFound()` rather than a 403: a caller without `account:provision` should not learn
 * this route exists at all, and `adminNavGroups` already filters the row out for them against the
 * same string, so no row can be shown to someone this segment would 404.
 *
 * This is still only the UI half — `procedure.provisionAccount` is independently gated
 * server-side (`account:provision`, mapped to `lightbridge-admin`'s `*` in the default role
 * mapping), so a forged session could at most render an empty form that fails on submit.
 */
export default async function AdminProvisionAccountRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.accountProvision)) {
    notFound();
  }
  return <AdminProvisionAccountCentre />;
}
