import { notFound } from 'next/navigation';

import { AdminProvisionAccountCentre } from '../../../../containers/admin-provision-account-centre';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/admin/provision-account` (lightbridge-authz#720/#722) — the console side of the backend's
 * `provisionAccount` RPC procedure: an admin creates a first `accounts` row (plus its mandatory
 * default project) for a Keycloak subject who can never self-provision one, because
 * `authz-idp`'s `/idp/callback` refuses sign-in for a subject with no account at all.
 *
 * Gated **server-side** on the `lightbridge-admin` role read from the decrypted session cookie,
 * before any markup is generated — byte-for-byte the same mechanism every other `/admin/*` route
 * uses (`admin-provision-account-route-gate.test.ts` covers this one the same way
 * `admin-refills-queue-route-gate.test.ts`/`admin-refill-policy-create-route-gate.test.ts` cover
 * theirs). `notFound()` rather than a 403: a non-admin should not learn this route exists at all.
 * This is still only the UI half — `procedure.provisionAccount` is independently gated server-side
 * (`account:provision`, admin-only via `lightbridge-admin`'s `*`), so a forged session could at
 * most render an empty form that fails on submit.
 */
export default async function AdminProvisionAccountRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <AdminProvisionAccountCentre />;
}
