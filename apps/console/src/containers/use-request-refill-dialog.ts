'use client';

import { formatUsd } from '@lightbridge/ui-web';
import type { RequestRefillDialogProps } from '@lightbridge/ui-web/src/components/request-refill-dialog';
import { useState } from 'react';

import { useRequestRefillDialogParams } from '../client/url-state';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import {
  BUDGET_HOME_ACCOUNT_ONLY_NOTE,
  smallestAllowedAmountMicros,
  sortedAllowedAmountsMicros,
  useBudgetRefillLadder,
  useRequestBudgetRefillMutation,
} from './use-budget-refill';
import { microsToAmount } from './refill-rows';

/**
 * `RequestRefillDialog` + the mutation that drives it, lifted OUT of `use-overview-screen.ts`
 * (rail-return round, 2026-08-30 — owner: "budget refill form disappeared"). Mirrors
 * `use-create-account-dialog.ts` exactly (ADR-0026's own precedent for "one dialog instance, three
 * structurally separate triggers"): `RequestRefillDialog` is reachable from the Budget card's
 * standing header action AND its breach-state button (both on `/`) AND the inspector rail's
 * quick-settings "Request refill" row (every route) — three subtrees that share nothing but the
 * query string.
 *
 *  - `useRequestRefillDialog()` — the FULL controller: dialog props AND the mutation. Call this
 *    exactly ONCE, in `app/(console)/layout.tsx`, which renders the one `RequestRefillDialog` this
 *    flow ever mounts.
 *  - `useOpenRequestRefillDialog()` — just the trigger, for every OTHER call site. It only flips
 *    the shared `?refill=true` flag; the smallest allowed amount is preselected by the full
 *    controller itself (see `resolvedAmountMicros` below) rather than passed through the trigger,
 *    so every trigger opens the dialog identically — there is no separate "preselect an amount"
 *    argument to keep in sync across three call sites.
 */
export interface RequestRefillDialogController {
  dialog: RequestRefillDialogProps;
  open: () => void;
}

export function useRequestRefillDialog(): RequestRefillDialogController {
  const scope = useConsoleScope();
  const ladder = useBudgetRefillLadder();
  const [params, setParams] = useRequestRefillDialogParams();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the dialog's selected-but-unsubmitted amount. `?refill=true` —
   * WHETHER the dialog is open — is real view state and lives in the URL; which of the policy's
   * allowed amounts is currently highlighted is not, the same shape every other dialog draft in
   * this app already follows. An empty string means "no explicit pick yet", which resolves to the
   * smallest allowed amount below — so every trigger opens the dialog on the same default without
   * having to pass one through.
   */
  const [amountDraft, setAmountDraft] = useState('');

  const refill = useRequestBudgetRefillMutation(() => {
    setAmountDraft('');
    void setParams({ open: false });
  });

  const sortedAmounts = sortedAllowedAmountsMicros(ladder.allowedAmountsMicros);
  const amountOptions = sortedAmounts.map((value) => ({
    value,
    label: `+${formatUsd(microsToAmount(value))}`,
  }));
  const resolvedAmountMicros =
    amountDraft && sortedAmounts.includes(amountDraft)
      ? amountDraft
      : (smallestAllowedAmountMicros(sortedAmounts) ?? '');

  const activeAccount = scope.allAccounts.find((account) => account.id === scope.value.accountId);

  return {
    open: () => {
      if (refill.errorMessage) refill.dismiss();
      setAmountDraft('');
      void setParams({ open: true });
    },
    dialog: {
      open: params.open,
      accountLabel: activeAccount ? accountScopeLabel(activeAccount) : '—',
      // Phase 2d (account-scoping audit): for a non-home account there is no allowed-amount set to
      // offer at all (`ladder.unavailable` — `getMyBudgetRefillLadder` cannot answer for it), so
      // this never falls back to `amountOptions`/`resolvedAmountMicros` computed off an empty
      // ladder that would otherwise look identical to "the policy currently offers nothing."
      amountOptions: ladder.unavailable ? [] : amountOptions,
      amountMicros: ladder.unavailable ? '' : resolvedAmountMicros,
      onAmountChange: setAmountDraft,
      submitting: refill.isPending,
      // The honest gap wins over a submit failure — there is nothing to retry until the account
      // itself changes, unlike a genuine submit error.
      error: ladder.unavailable ? BUDGET_HOME_ACCOUNT_ONLY_NOTE : refill.errorMessage,
      canSubmit: !ladder.unavailable && resolvedAmountMicros !== '' && !refill.isPending,
      onSubmit: () => {
        if (ladder.unavailable || resolvedAmountMicros === '') return;
        refill.mutate(resolvedAmountMicros);
      },
      onOpenChange: (open) => {
        if (open) return;
        if (refill.errorMessage) refill.dismiss();
        setAmountDraft('');
        void setParams({ open: false });
      },
    },
  };
}

/**
 * The `Request refill` trigger, for every call site that is not `app/(console)/layout.tsx` itself
 * — see this module's own doc comment for why this is the lightweight half of the pair.
 */
export function useOpenRequestRefillDialog(): () => void {
  const [, setParams] = useRequestRefillDialogParams();
  return () => {
    void setParams({ open: true });
  };
}
