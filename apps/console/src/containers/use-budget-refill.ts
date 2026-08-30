'use client';

import { createId } from '@lightbridge/authz-rpc';
import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { currentBudgetPeriod } from '@lightbridge/hooks/budget-tiers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useSharedMutation } from '../client/use-shared-mutation';
import { isHomeAccount } from './account-ownership';

/**
 * The budget-refill ladder query and the `requestBudgetRefill` mutation — shared by `/`'s own
 * Budget card (the breach button, which now only NAVIGATES — see `use-overview-screen.ts`'s
 * `refillAction`) and `/accounts/<id>/refill` (IA v3 phase 3), the one screen that actually
 * SUBMITS a refill request now that `RequestRefillDialog` is deleted (owner: "refill deserves its
 * own page, not a dialog three triggers all had to agree on").
 *
 * `REFILL_MUTATION_KEY` used to be `OVERVIEW_REFILL_MUTATION_KEY` — named for `/`'s own screen
 * back when the dialog's outcome had to stay visible on TWO zones (`/`'s screen and whichever
 * mounted the dialog) via the shared `MutationCache`. That "two zones" need is gone: the refill
 * page is now the ONLY zone that ever fires this mutation, so the name (and the mutation itself)
 * moved to the plain, non-route-specific form. Kept as a real `MutationKey` constant regardless —
 * `useSharedMutation`'s own contract — rather than an inline array literal, so a future second
 * caller can still read the outcome via `useSharedMutationState` without redeclaring it.
 */
export const REFILL_MUTATION_KEY = ['budget', 'requestRefill'] as const;

/**
 * The budget domain's honesty caption for a scoped account that is not the caller's HOME account
 * (Phase 2d, account-scoping audit, converse-frontends#368/#392). `getMyBudgetBalance`,
 * `getMyBudgetRefillLadder` and `listMyAugmentationRequests` (`authz.cstack:1291,1471` and its
 * sibling) take no target account at all — they always answer for `auth().id`, the caller's home
 * account, by construction — and the admin equivalent (`getBudgetBalance`) needs the
 * operator-only `budget:read` permission a plain second-account owner does not hold. There is
 * today no `budget:read-own`-gated way to read a non-home account's balance, refill ladder or
 * request history at all — see `account-ownership.ts`'s `isHomeAccount` for the full argument and
 * the backend gap filed from this audit. Showing the home account's own numbers under a DIFFERENT
 * account's label would be the exact class of bug this audit exists to kill, so every
 * budget-domain surface renders this instead. Exported so every reader of this gap (`/`'s Budget
 * card, `/accounts/<id>/refill`'s two cards) shares the identical wording rather than
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

/** `allowedAmountsMicros`, ascending — the vocabulary `RefillRequestForm`'s amount select and
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
  /** A no-op while `unavailable` — there is nothing to retry until the account itself changes. */
  refetch: () => void;
}

/** `getMyBudgetRefillLadder` — the active refill policy's allowed amounts for the SCOPED account
 *  this billing period. Shared by `use-overview-screen.ts` (the breach button's own visibility
 *  guard) and `use-refill-screen.ts` (the refill page's own amount select) so the two can never
 *  disagree about what amounts are actually offerable.
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
    refetch: () => void ladderQuery.refetch(),
  };
}

/**
 * The mutation itself — `/accounts/<id>/refill`'s own submit (`use-refill-screen.ts`). Reads
 * `scope.value.projectId` the same way every other scope-aware container does: an empty string
 * (the parser's own default, "every project in this account") becomes `undefined` on the wire,
 * so a refill requested off the account-wide page carries no `projectId` at all, exactly what
 * `RequestBudgetRefillInput.projectId` being optional is for.
 */
export function useRequestBudgetRefillMutation(onSuccess?: () => void) {
  const budgetClient = useConsoleBudgetClient();
  const queryClient = useQueryClient();
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const accountId = scope.value.accountId;
  const projectId = scope.value.projectId || undefined;
  const period = useMemo(() => currentBudgetPeriod(), []);

  return useSharedMutation<string, AugmentationRequest>({
    mutationKey: REFILL_MUTATION_KEY,
    mutationFn: (requestedAmountMicros) => {
      // A guard, not a UI branch — `use-refill-screen.ts`'s own `canSubmit` already keeps the
      // form's primary disabled for a non-home account (Phase 2d: the ladder that would validate
      // `requestedAmountMicros` against is itself never fetched for one, see
      // `useBudgetRefillLadder`'s `unavailable`). This only fires against a caller bypassing the
      // form entirely — never silently submit a refill validated against the WRONG account's
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
          projectId,
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
      void queryClient.invalidateQueries({
        queryKey: ['budget', 'myAugmentationRequests', accountId],
      });
      onSuccess?.();
    },
  });
}
