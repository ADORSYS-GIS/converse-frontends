'use client';

import type { PolicySimulatorProps } from '@lightbridge/ui-web';
import { formatUsd } from '@lightbridge/ui-web';
import { useState } from 'react';

import { REFILL_OPTIONS_DISABLED_REASON } from '../client/console-chrome';
import { useConsoleBudgetClient } from '../client/rpc-clients';
import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { microsToAmount } from './refill-rows';
import {
  BUDGET_HOME_ACCOUNT_ONLY_NOTE,
  sortedAllowedAmountsMicros,
  useBudgetRefillLadder,
} from './use-budget-refill';

/** `/settings/refill-options`'s Card A — a read-only echo of the caller's own ladder, never a
 *  submit surface (that is `/accounts/<id>/refill`'s whole job). Mirrors `RefillRequestFormState`
 *  minus the submit-only branches, since there is nothing to submit here. */
export type RefillOptionsLadderState =
  | { status: 'ready'; amounts: string[] }
  | { status: 'empty'; caption: string }
  | { status: 'unavailable'; caption: string }
  | { status: 'loading' }
  | { status: 'error'; errorMessage?: string; onRetry?: () => void };

export interface RefillOptionsScreen {
  scopeLabel: string | undefined;
  ladder: RefillOptionsLadderState;
  simulator: PolicySimulatorProps;
  /** The honest caption for the two blocks this page omits outright (policy status, stored rule
   *  data) — see `REFILL_OPTIONS_DISABLED_REASON`'s own doc comment for the backend gap. */
  omittedNote: string;
}

/** Converts a typed dollar string to an integer-micros decimal string, or `null` for anything
 *  that isn't a non-negative finite number — the same contract `RequestBudgetRefillInput.
 *  requestedAmountMicros` needs, computed here since `simulateBudgetPolicy`'s own caller types
 *  the amount in dollars (`PolicySimulatorProps.requestedAmount`), not micros. */
function dollarsToMicros(amount: string): string | null {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 1_000_000).toString();
}

export function useRefillOptionsScreen(): RefillOptionsScreen {
  const scope = useConsoleScope();
  const budgetClient = useConsoleBudgetClient();
  const ladderQuery = useBudgetRefillLadder();

  const activeAccount = scope.allAccounts.find(
    (account) => account.id === scope.value.accountId
  );
  const scopeLabel = activeAccount ? accountScopeLabel(activeAccount) : undefined;

  const sortedAmounts = sortedAllowedAmountsMicros(ladderQuery.allowedAmountsMicros);
  let ladder: RefillOptionsLadderState;
  if (ladderQuery.unavailable) {
    ladder = { status: 'unavailable', caption: BUDGET_HOME_ACCOUNT_ONLY_NOTE };
  } else if (ladderQuery.loading) {
    ladder = { status: 'loading' };
  } else if (ladderQuery.error) {
    ladder = {
      status: 'error',
      errorMessage: 'Could not load the refill policy.',
      onRetry: ladderQuery.refetch,
    };
  } else if (sortedAmounts.length === 0) {
    ladder = {
      status: 'empty',
      caption: 'The active refill policy currently offers no amount for this account.',
    };
  } else {
    ladder = {
      status: 'ready',
      amounts: sortedAmounts.map((value) => `+${formatUsd(microsToAmount(value))}`),
    };
  }

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — "in-flight form drafts whose content must not
   * leak into URLs or history"): the simulator's rule-data/scenario/amount draft, and its last
   * result. Nothing here is shareable view state — `simulateBudgetPolicy` reads no stored policy
   * and mutates nothing, so there is no "what am I looking at" fact a URL could usefully carry;
   * it is pure scratch input, the same shape a reviewer's unsent decision note already follows.
   */
  const [ruleDataJson, setRuleDataJson] = useState('');
  const [scenarioJson, setScenarioJson] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [result, setResult] = useState<PolicySimulatorProps['result']>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = () => {
    setError(undefined);
    const requestedAmountMicros = dollarsToMicros(requestedAmount);
    if (requestedAmountMicros === null) {
      setError('Requested amount must be a non-negative number.');
      return;
    }
    setSubmitting(true);
    budgetClient.procedures
      .simulateBudgetPolicy({
        args: { ruleDataJson, scenarioJson, requestedAmountMicros },
      })
      .then((decision) => {
        setResult({
          effect: decision.effect,
          approvedAmount: microsToAmount(decision.approvedAmountMicros),
          maximumAmount: microsToAmount(decision.maximumAmountMicros),
          reasonCodes: decision.reasonCodes,
          matchedRuleIds: decision.matchedRuleIds,
          policyRevision: decision.policyRevision,
          requiredApproverRole: decision.obligations?.requiredApproverRole,
        });
      })
      .catch((cause: unknown) => {
        setResult(undefined);
        setError(cause instanceof Error ? cause.message : 'The simulation failed.');
      })
      .finally(() => setSubmitting(false));
  };

  return {
    scopeLabel,
    ladder,
    simulator: {
      ruleDataJson,
      onRuleDataJsonChange: (value) => {
        setRuleDataJson(value);
        setResult(undefined);
      },
      scenarioJson,
      onScenarioJsonChange: (value) => {
        setScenarioJson(value);
        setResult(undefined);
      },
      requestedAmount,
      onRequestedAmountChange: (value) => {
        setRequestedAmount(value);
        setResult(undefined);
      },
      submitting,
      error,
      canSubmit: !submitting,
      onSubmit,
      result,
    },
    omittedNote: REFILL_OPTIONS_DISABLED_REASON,
  };
}
