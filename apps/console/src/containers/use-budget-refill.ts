'use client';

import { createId } from '@lightbridge/authz-rpc';
import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useSharedMutation, useSharedMutationState } from '../client/use-shared-mutation';
import { isHomeAccount } from './account-ownership';

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

/**
 * The Budget card's/refill dialog's own honesty caption for a scoped account that is not the
 * caller's HOME account (Phase 2d, account-scoping audit, converse-frontends#368/#392).
 * `getMyBudgetBalance` and `getMyBudgetRefillLadder` (`authz.cstack:1291,1471`) take no target
 * account at all — they always answer for `auth().id`, the caller's home account, by construction
 * — and the admin equivalent (`getBudgetBalance`) needs the operator-only `budget:read`
 * permission a plain second-account owner does not hold. There is today no `budget:read-own`-
 * gated way to read a non-home account's balance or refill ladder at all — see
 * `account-ownership.ts`'s `isHomeAccount` for the full argument and the backend gap filed from
 * this audit. Showing the home account's own numbers under a DIFFERENT account's label would be
 * the exact class of bug this audit exists to kill, so every budget-domain surface renders this
 * instead. Exported so `use-overview-screen.ts` (the Budget card) and
 * `use-request-refill-dialog.ts` (the refill form) share the identical wording rather than two
 * independently-drifting captions for the same gap.
 */
export const BUDGET_HOME_ACCOUNT_ONLY_NOTE =
  'Budget balance and refill requests are only available for your home account today — see ' +
  'lightbridge-authz#577.';

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
  /** `true` for a scoped account that is not the caller's HOME account — `getMyBudgetRefillLadder`
   *  cannot answer for it at all (see `BUDGET_HOME_ACCOUNT_ONLY_NOTE`'s own doc comment), so this
   *  is never fetched and `allowedAmountsMicros` stays `[]` on principle, not because the policy
   *  genuinely offers nothing. Callers must check this before treating an empty ladder as "no
   *  refill amount currently offered." */
  unavailable: boolean;
}

/** `getMyBudgetRefillLadder` — the active refill policy's allowed amounts for the SCOPED account
 *  this billing period. Shared by `use-overview-screen.ts` (the breach preselect) and
 *  `use-request-refill-dialog.ts` (the dialog's amount select) so the two can never disagree about
 *  what amounts are actually offerable.
 *
 *  Phase 2d (account-scoping audit): only ever fetched for the caller's HOME account —
 *  `getMyBudgetRefillLadder` has no target-account argument at all, so it structurally cannot
 *  answer for anyone else's. `accountId` is folded into the query key (it was not before this
 *  phase) precisely so switching the scoped account never shows a stale ladder cached under a
 *  different account's key — since the query only ever fires for the home account, every other
 *  account's key is simply never populated. */
export function useBudgetRefillLadder(): BudgetRefillLadder {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const budgetClient = useConsoleBudgetClient();
  const accountId = scope.value.accountId;
  const unavailable = Boolean(accountId) && !isHomeAccount(accountId, session);
  // Resolved once per mount, matching `use-overview-screen.ts`'s own `period` — a calendar-month
  // period changes at most once a session.
  const period = useMemo(() => currentBudgetPeriod(), []);

  const ladderQuery = useQuery({
    queryKey: ['budget', 'myRefillLadder', accountId, period],
    queryFn: () => budgetClient.procedures.getMyBudgetRefillLadder({ args: { period } }),
    enabled: Boolean(accountId) && !unavailable,
    staleTime: 30_000,
  });

  return {
    accountId,
    period,
    allowedAmountsMicros: unavailable ? [] : (ladderQuery.data?.allowedAmountsMicros ?? []),
    loading: !unavailable && ladderQuery.isPending,
    error: !unavailable && ladderQuery.isError,
    unavailable,
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
  const session = useConsoleSession();
  const accountId = scope.value.accountId;
  const period = useMemo(() => currentBudgetPeriod(), []);

  return useSharedMutation<string, AugmentationRequest>({
    mutationKey: OVERVIEW_REFILL_MUTATION_KEY,
    mutationFn: (requestedAmountMicros) => {
      // A guard, not a UI branch — `use-request-refill-dialog.ts`'s own `canSubmit` already keeps
      // the dialog's primary disabled for a non-home account (Phase 2d: the ladder that would
      // validate `requestedAmountMicros` against is itself never fetched for one, see
      // `useBudgetRefillLadder`'s `unavailable`). This only fires against a caller bypassing the
      // dialog entirely — never silently submit a refill validated against the WRONG account's
      // ladder.
      if (!isHomeAccount(accountId, session)) {
        throw new Error(BUDGET_HOME_ACCOUNT_ONLY_NOTE);
      }
      return budgetClient.procedures.requestBudgetRefill({
        args: {
          accountId,
          // One account is one budget account (`authz.cstack`'s own `GetMyBudgetBalanceInput`
          // doc comment: "budget_account_id is always identical to account_id").
          budgetAccountId: accountId,
          period,
          idempotencyKey: createId(),
          requestedAmountMicros,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budget', 'myBalance', accountId, period] });
      // Matches `useBudgetRefillLadder`'s own key shape exactly (`accountId` before `period`) —
      // TanStack Query's `invalidateQueries` matches by positional PREFIX, so a stale key shape
      // here would silently invalidate nothing.
      void queryClient.invalidateQueries({
        queryKey: ['budget', 'myRefillLadder', accountId, period],
      });
      onSuccess?.();
    },
  });
}

/** Read-only: the shared outcome, for a zone that renders it but does not itself submit
 *  (`use-overview-screen.ts`'s `refillErrorMessage`, once the dialog owns the actual submit). */
export function useOverviewRefillOutcome() {
  return useSharedMutationState<AugmentationRequest>(OVERVIEW_REFILL_MUTATION_KEY);
}
