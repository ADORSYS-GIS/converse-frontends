'use client';

import { RefillPolicyFormView } from './admin-refill-policies-centre';
import { useRefillPolicyCreateScreen } from './use-refill-policy-create-screen';

/**
 * `/admin/refill-policies/create` — owner review round 2 (2026-08-31, converse-frontends#368
 * finding #4, verbatim): "You made out of /admin/refill-policies?create=true a full page.
 * Instead, I was thinking of a modal. But it's fine. Just move it to a page
 * /admin/refill-policies/create." Renders the SAME `RefillPolicyFormView`
 * `/admin/refill-policies`'s own `edit` mode uses (`admin-refill-policies-centre.tsx`, which
 * exports it for exactly this reuse), fed by this route's own screen hook
 * (`use-refill-policy-create-screen.ts`) rather than the list route's mode-split one — there is no
 * `?create=` param left to derive a mode from. `?edit=<id>`/`?simulate=<id>` on
 * `/admin/refill-policies` itself are unchanged (the owner named only create).
 */
export function AdminRefillPolicyCreateCentre() {
  const form = useRefillPolicyCreateScreen();
  return <RefillPolicyFormView form={form} />;
}
