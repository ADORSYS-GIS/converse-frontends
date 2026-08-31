'use client';

import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import type { RefillHistoryState, RefillRequestFormState } from '@lightbridge/ui-web';
import { formatUsd } from '@lightbridge/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useAccountId } from '../client/use-account-id';
import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { isHomeAccount } from './account-ownership';
import { microsToAmount, toRefillHistoryRow } from './refill-rows';
import {
  BUDGET_HOME_ACCOUNT_ONLY_NOTE,
  smallestAllowedAmountMicros,
  sortedAllowedAmountsMicros,
  useBudgetRefillLadder,
  useRequestBudgetRefillMutation,
} from './use-budget-refill';

/** How many of the caller's own past requests `/settings/accounts/<id>/request-refill` shows — a recent-history
 *  card, not a paginated ledger; the admin review queue (`ReviewQueue`) is where a full,
 *  paginated listing belongs. */
const HISTORY_PAGE_SIZE = 10;

export interface RefillScreen {
  /** The path account id — `AccountDetailSubNav`'s own tab hrefs (IA v3 phase E). */
  accountId: string;
  /** `PageHeader.title`'s own subtitle ingredients — the account label, the current billing
   *  period, and the scoped project's name when `?project=` is present (absent = account-wide,
   *  per `use-console-scope.ts`'s own "empty project means every project" contract). */
  accountLabel: string;
  periodLabel: string;
  projectLabel: string | undefined;
  form: RefillRequestFormState;
  history: RefillHistoryState;
}

export function useRefillScreen(): RefillScreen {
  const accountId = useAccountId();
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const budgetClient = useConsoleBudgetClient();

  // Phase 2d gating, restated for this page (see `use-budget-refill.ts`'s
  // `BUDGET_HOME_ACCOUNT_ONLY_NOTE`): `getMyBudgetRefillLadder`/`listMyAugmentationRequests` both
  // answer for the caller's HOME account only, by construction — never fetched, and never
  // rendered as if they answered for a different scoped account.
  const accountIsHome = isHomeAccount(accountId, session);
  const period = useMemo(() => currentBudgetPeriod(), []);

  const activeAccount = scope.allAccounts.find((account) => account.id === accountId);
  const accountLabel = activeAccount ? accountScopeLabel(activeAccount) : '—';
  const projectLabel = scope.value.projectId
    ? scope.projects.find((project) => project.id === scope.value.projectId)?.label
    : undefined;

  // ── Card 1: amount choice ───────────────────────────────────────────────────────────────
  const ladder = useBudgetRefillLadder();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the selected-but-unsubmitted amount. The refill PAGE itself
   * (`/settings/accounts/<id>/request-refill`) is real view state — the URL a trigger navigates to — but which of
   * the policy's allowed amounts is currently highlighted is not, the same shape the deleted
   * `RequestRefillDialog`'s own draft followed. An empty string resolves to the smallest allowed
   * amount below, so the page opens with a sensible default without a separate "preselect"
   * argument to carry through every trigger.
   */
  const [amountDraft, setAmountDraft] = useState('');

  const refill = useRequestBudgetRefillMutation(() => setAmountDraft(''));

  const sortedAmounts = sortedAllowedAmountsMicros(ladder.allowedAmountsMicros);
  const amountOptions = sortedAmounts.map((value) => ({
    value,
    label: `+${formatUsd(microsToAmount(value))}`,
  }));
  const resolvedAmountMicros =
    amountDraft && sortedAmounts.includes(amountDraft)
      ? amountDraft
      : (smallestAllowedAmountMicros(sortedAmounts) ?? '');

  let form: RefillRequestFormState;
  if (!accountIsHome) {
    form = { status: 'unavailable', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
  } else if (ladder.loading) {
    form = { status: 'loading' };
  } else if (ladder.error) {
    form = {
      status: 'error',
      errorMessage: 'Could not load the refill policy.',
      onRetry: ladder.refetch,
    };
  } else if (amountOptions.length === 0) {
    form = {
      status: 'empty',
      caption: 'The active refill policy currently offers no amount for this account.',
    };
  } else {
    form = {
      status: 'ready',
      amountOptions,
      amountMicros: resolvedAmountMicros,
      onAmountChange: setAmountDraft,
      submitting: refill.isPending,
      error: refill.errorMessage,
      canSubmit: resolvedAmountMicros !== '' && !refill.isPending,
      onSubmit: () => {
        if (resolvedAmountMicros === '') return;
        refill.mutate(resolvedAmountMicros);
      },
    };
  }

  // ── Card 2: the caller's own history ────────────────────────────────────────────────────
  const historyQuery = useQuery({
    queryKey: ['budget', 'myAugmentationRequests', accountId],
    queryFn: () =>
      budgetClient.procedures.listMyAugmentationRequests({
        args: { limit: HISTORY_PAGE_SIZE },
      }),
    enabled: accountIsHome,
    staleTime: 30_000,
  });
  // The fetch timestamp, not `Date.now()` — matches `use-refills-queue-screen.ts`'s own
  // "submitted N ago is relative to when the queue was read" reasoning.
  const historyNow = historyQuery.dataUpdatedAt;

  let history: RefillHistoryState;
  if (!accountIsHome) {
    history = { status: 'unavailable', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
  } else if (historyQuery.isPending) {
    history = { status: 'loading' };
  } else if (historyQuery.isError) {
    history = {
      status: 'error',
      errorMessage: 'Could not load your refill history.',
      onRetry: () => void historyQuery.refetch(),
    };
  } else {
    history = {
      status: 'ready',
      rows: (historyQuery.data?.entries ?? []).map((request) =>
        toRefillHistoryRow(request, historyNow)
      ),
    };
  }

  return {
    accountId,
    accountLabel,
    periodLabel: period,
    projectLabel,
    form,
    history,
  };
}
