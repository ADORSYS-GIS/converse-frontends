'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { RefillHistory } from '@lightbridge/ui-web/src/sections/refill-history';
import { RefillRequestForm } from '@lightbridge/ui-web/src/sections/refill-request-form';

import { useRefillScreen } from './use-refill-screen';

/**
 * `/accounts/<id>/refill` — IA v3 phase 3 ("refill as a page"). Replaces `RequestRefillDialog`
 * (deleted): every refill trigger across the console — the Budget card's standing action and its
 * breach button (`/`), the old inspector rail row (its whole panel is deleted this phase too) —
 * now navigates here instead of opening a shared dialog instance three separate triggers had to
 * agree on.
 *
 * Two cards, top to bottom:
 *
 *  1. `RefillRequestForm` — the amount choice, over the account's active refill policy ladder
 *     (`use-budget-refill.ts`'s `useBudgetRefillLadder`, shared with `/`'s own breach button —
 *     the two can never disagree about what amounts are actually offerable). Submits through the
 *     SAME `useRequestBudgetRefillMutation` the Budget card used to drive from inside the dialog.
 *  2. `RefillHistory` — the caller's own past requests, `procedure.listMyAugmentationRequests`
 *     (confirmed present on the generated client this phase — no backend gap to file for it).
 *
 * Both cards render the honest home-account-only gap instead of fabricated data for a scoped
 * account that is not the caller's own (Phase 2d, `account-ownership.ts`'s `isHomeAccount`) — see
 * `use-refill-screen.ts`'s own doc comment for the full argument.
 */
export function RefillCentre() {
  const screen = useRefillScreen();

  const subtitle = screen.projectLabel
    ? `${screen.accountLabel} · ${screen.projectLabel} · ${screen.periodLabel}`
    : `${screen.accountLabel} · ${screen.periodLabel}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Request a budget refill" subtitle={subtitle} />

      <Card>
        <RefillRequestForm state={screen.form} />
      </Card>

      <Card>
        <RefillHistory state={screen.history} />
      </Card>
    </div>
  );
}
