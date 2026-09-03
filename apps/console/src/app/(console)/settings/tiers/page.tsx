import { notFound } from 'next/navigation';

import { TiersCentre } from '../../../../containers/tiers-centre';
import { can } from '../../../../server/access';
import { readSession } from '../../../../server/session-store';
import { PERMISSION } from '../../../../shared/permissions';

/**
 * `/settings/tiers` — "Tier configs." `force-dynamic` is inherited from `settings/layout.tsx`.
 *
 * Gated **server-side** on **`project:update`** (owner ruling, 2026-09-03, verbatim: "users with
 * the role -viewer should not even see tiers"), through the same `readSession` + `can()` +
 * `notFound()` contract every `/admin/*` segment uses — a caller without the permission should not
 * learn the route is here, and `settingsNavGroups` omits the row against the identical string, so
 * the two cannot drift into "shown and then 404s".
 *
 * **Why a WRITE permission on a read-only screen.** This page renders no picker at all: the
 * billing-plan catalogue and the tiers currently assigned to the scoped account and its projects,
 * both read-only (see `use-tiers-screen.ts`). The permission that authorises CHANGING any of it is
 * `project:update` — `procedure.setProjectQuota` is the sole write path onto `Project.projectQuota`
 * since lightbridge-authz#379, and `rpc_authorize.rs` maps it to exactly that string. A tier
 * catalogue read by someone who can never assign a tier is a menu they may not order from, and the
 * ruling is explicit that they must not see it. So the gate is the write permission, not the read
 * one (`apikey:create`, which `listBillingPlans` itself is gated on) that a viewer might hold.
 *
 * `project:update` rather than `account:update` for the second half of the same reason:
 * `lightbridge-editor` holds `project:*` and NOT `account:update`, so the account permission would
 * hide this screen from editors as well as viewers — one role too many. `lightbridge-viewer` holds
 * `project:read` only, which is the line the ruling draws.
 */
export default async function SettingsTiersRoute() {
  const session = await readSession();
  if (!session || !can(session, PERMISSION.projectUpdate)) {
    notFound();
  }
  return <TiersCentre />;
}
