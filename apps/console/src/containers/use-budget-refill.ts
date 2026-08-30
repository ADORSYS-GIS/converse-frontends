'use client';

import { createId } from '@lightbridge/authz-rpc';
import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { useSharedMutation, useSharedMutationState } from '../client/use-shared-mutation';

/**
 * The budget-refill ladder query and the `requestBudgetRefill` mutation, lifted OUT of
 * `use-overview-screen.ts` (rail-return round, 2026-08-30 — owner: "budget refill form
 * disappeared") so `RequestRefillDialog` can be driven from a container mounted once in the
 * layout (`use-request-refill-dialog.ts`) rather than only from `/`'s own screen adapter.
 *
 * `OVERVIEW_REFILL_MUTATION_KEY` keeps its original name (rather than becoming a generic
 * `REFILL_MUTATION_KEY`) on purpose: it is a `MutationKey`, matched STRUCTURALLY by
 * `useMutationState`/`findAll` (`use-shared-mutation.ts`'s own doc comment), so changing its
 * contents — even just the array's own literal strings — would silently stop `/`'s existing
 * `refillErrorMessage` (still reading this key) from agreeing with a submit made from the dialog.
 * Same idiom `use-refills-queue-screen.ts`'s `DECIDE_MUTATION_KEY` already documents: "two zones mean two
 * `useMutation` instances... reading the outcome from the shared `MutationCache` is what makes one
 * instance's failure visible to the other" — here the two zones are `/`'s own screen and whichever
 * mounts `RequestRefillDialog` (the layout).
 */
export const OVERVIEW_REFILL_MUTATION_KEY = ['budget', 'requestRefill', 'overview'] as const;

/** Ascending-sorts `allowedAmountsMicros` (decimal strings — `BigInt`, never `Number`, since a
 *  micros amount can exceed `Number.MAX_SAFE_INTEGER`) and returns the smallest. `null` when the
 *  policy currently offers nothing. */
export function smallestAllowedAmountMicros(amountsMicros: string[]): string | null {
  if (amountsMicros.length === 0) return null;
  return [...amountsMicros].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1))[0];
}

/** `allowedAmountsMicros`, ascending — the vocabulary `RequestRefillDialog`'s amount select and
 *  `/`'s own breach-preselect both read from the same sort. */
export function sortedAllowedAmountsMicros(amountsMicros: string[]): string[] {
  return [...amountsMicros].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
}

export interface BudgetRefillLadder {
  accountId: string;
  period: string;
  allowedAmountsMicros: string[];
  loading: boolean;
  error: boolean;
}

/** `getMyBudgetRefillLadder` — the active refill policy's allowed amounts for the SCOPED account
 *  this billing period. Shared by `use-overview-screen.ts` (the breach preselect) and
 *  `use-request-refill-dialog.ts` (the dialog's amount select) so the two can never disagree about
 *  what amounts are actually offerable. */
export function useBudgetRefillLadder(): BudgetRefillLadder {
  const scope = useConsoleScope();
  const budgetClient = useConsoleBudgetClient();
  const accountId = scope.value.accountId;
  // Resolved once per mount, matching `use-overview-screen.ts`'s own `period` — a calendar-month
  // period changes at most once a session.
  const period = useMemo(() => currentBudgetPeriod(), []);

  const ladderQuery = useQuery({
    queryKey: ['budget', 'myRefillLadder', period],
    queryFn: () => budgetClient.procedures.getMyBudgetRefillLadder({ args: { period } }),
    enabled: Boolean(accountId),
    staleTime: 30_000,
  });

  return {
    accountId,
    period,
    allowedAmountsMicros: ladderQuery.data?.allowedAmountsMicros ?? [],
    loading: ladderQuery.isPending,
    error: ladderQuery.isError,
  };
}

/**
 * The mutation itself, owned by whichever zone actually submits — `mutate`/`isPending` are only
 * meaningful on the instance that fired it, but `errorMessage` is readable from ANY zone via
 * `useSharedMutationState` (see `useOverviewRefillOutcome` below), so a caller that only needs to
 * RENDER the outcome (not submit) should reach for that instead of instantiating a second, unused
 * `useMutation`.
 */
export function useRequestBudgetRefillMutation(onSuccess?: () => void) {
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();
  const scope = useConsoleScope();
  const accountId = scope.value.accountId;
  const period = useMemo(() => currentBudgetPeriod(), []);

  return useSharedMutation<string, AugmentationRequest>({
    mutationKey: OVERVIEW_REFILL_MUTATION_KEY,
    mutationFn: (requestedAmountMicros) =>
      budgetClient.procedures.requestBudgetRefill({
        args: {
          accountId,
          // One account is one budget account (`authz.cstack`'s own `GetMyBudgetBalanceInput`
          // doc comment: "budget_account_id is always identical to account_id").
          budgetAccountId: accountId,
          period,
          idempotencyKey: createId(),
          requestedAmountMicros,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget', 'myBalance', accountId, period] });
      void queryClient.invalidateQueries({ queryKey: ['budget', 'myRefillLadder', period] });
      onSuccess?.();
    },
  });
}

/** Read-only: the shared outcome, for a zone that renders it but does not itself submit
 *  (`use-overview-screen.ts`'s `refillErrorMessage`, once the dialog owns the actual submit). */
export function useOverviewRefillOutcome() {
  return useSharedMutationState<AugmentationRequest>(OVERVIEW_REFILL_MUTATION_KEY);
}
