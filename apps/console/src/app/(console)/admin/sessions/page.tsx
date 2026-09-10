import { notFound } from 'next/navigation';

import { AdminSessionsCentre } from '../../../../containers/admin-sessions-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

export const dynamic = 'force-dynamic';

/**
 * `/admin/sessions` — the estate-wide session ledger (converse-frontends#450, story C7), gated
 * **server-side** on **`session:read`**, read from the permission set `getMyAccess` resolved into
 * the decrypted session cookie, before any markup is generated. The same shape every other
 * `/admin/*` segment carries since converse-frontends#452 replaced the `lightbridge-admin` role
 * check: `readSession` + `can(session, …)` + `notFound()`, one permission per destination.
 *
 * **`session:read` and not `session:read-own`.** The self-service permission is the FLOOR every
 * default role holds, and it is what `querySessions`' coarse RBAC gate is mapped to — a caller
 * holding only that reaches the procedure and gets their own rows back, which is not what an
 * operator ledger is for. This screen is the estate view, so it gates on the widening.
 *
 * `notFound()` rather than a 403: a caller without `session:read` should not learn that this route
 * exists at all, and `adminNavGroups` already filters the "Sessions" row out for them against the
 * same string, so no row can be shown to someone this segment would 404.
 *
 * This is still only the UI half, and here the other half is unusually strong: `lightbridge-authz`
 * folds `session:read` into the SQL `WHERE` of `querySessions` itself (the `Session` model's own
 * `@@allow("read", …)` clause, lightbridge-authz#657), so a forged session could at most enumerate
 * its own rows — there is no filter combination that reaches another subject's, and no
 * handler-side clamp that could be forgotten.
 *
 * `AdminSessionsCentre` renders its row detail as a `BottomSheet` inline, as an ordinary component
 * call inside this already-gated tree — never a sibling route segment that could bypass this gate.
 */
export default async function AdminSessionsRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.sessionRead)) {
    notFound();
  }
  return <AdminSessionsCentre />;
}
