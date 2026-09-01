'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { RefillHistory } from '@lightbridge/ui-web/src/sections/refill-history';
import { RefillRequestForm } from '@lightbridge/ui-web/src/sections/refill-request-form';

import { AccountDetailSubNav } from './account-detail-sub-nav';
import { useRefillScreen } from './use-refill-screen';

/**
 * `/settings/accounts/<id>/request-refill` — IA v3 phase 3 ("refill as a page"), moved off
 * `/accounts/<id>/refill` by IA v3 phase E (the old path 308s here verbatim, `?project=`
 * included). Replaces `RequestRefillDialog` (deleted): every refill trigger across the console —
 * the Budget card's standing action and its breach button (`/`), the account detail screen's own
 * `Request refill…` action — now navigates here instead of opening a shared dialog instance
 * several separate triggers had to agree on.
 *
 * Refill is account-scoped by construction now (task directive): the account detail sub-nav
 * (`AccountDetailSubNav`) sits right under the header, the same tab row `/settings/accounts/<id>`
 * and its `/projects` sibling both render, so moving between the three needs no back-and-forth
 * through the settings nav.
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

      <AccountDetailSubNav accountId={screen.accountId} />

      <Card>
        <RefillRequestForm state={screen.form} />
      </Card>

      <Card>
        <RefillHistory state={screen.history} />
      </Card>
    </div>
  );
}
