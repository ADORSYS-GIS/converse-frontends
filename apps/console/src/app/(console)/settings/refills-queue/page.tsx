import { notFound } from 'next/navigation';

import { RefillsQueueCentre } from '../../../../containers/refills-queue-centre';
import { readSession } from '../../../../server/session-store';
import { isAdmin } from '../../../../server/tokens';

export const dynamic = 'force-dynamic';

/**
 * `/settings/refills-queue` — gated **server-side** on the `lightbridge-admin` role read from the
 * decrypted session cookie, before any refill-queue markup is generated. IA v3 phase 2 ("the
 * settings area") moved this route here wholesale from `/admin` (`git mv`, middleware 308s the
 * old path) — the gate below is kept byte-for-byte, per that move's own directive
 * (`settings-route-gate.test.ts` is the regression guard for it).
 *
 * `notFound()` rather than a 403: a non-admin should not learn that this route exists at all, and
 * the console-ui contract already hides both the account-area Operator group and the settings
 * area's own "Refills queue" nav entry for them. This is still only the UI half —
 * `lightbridge-authz` enforces `budget:review` on every procedure the screen calls, so a forged
 * session could at most render an empty queue.
 *
 * `RefillsQueueCentre` renders its review detail as a `BottomSheet` inline, as an ordinary
 * component call inside this already-gated tree — never a sibling route segment that could bypass
 * this gate.
 */
export default async function RefillsQueueRoute() {
  const session = await readSession();
  if (!session || !isAdmin(session.user.roles)) {
    notFound();
  }
  return <RefillsQueueCentre />;
}
