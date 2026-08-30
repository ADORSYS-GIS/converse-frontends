import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { formatUsd } from '../../lib/money';
import { DATA_INK_CLASS, LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import type { PolicySimulatorProps } from './types';

/**
 * `/settings/refill-options`'s own "try a policy" card (IA v3 phase 3): `procedure.
 * simulateBudgetPolicy` evaluates a rule set the caller pastes in against a scenario and a
 * requested amount, and returns a `Decision` — it mutates nothing and reads no stored policy, so
 * it is offered to every signed-in user, not gated behind an operator role (the same visibility
 * the "Refill options policies" nav row already carries).
 *
 * Deliberately NOT the stored/active policy: `getBudgetPolicyStatus` and the rule content behind
 * it have no read API today (see `REFILL_OPTIONS_DISABLED_REASON`, `client/console-chrome.tsx`) —
 * this card is a scratch pad over rule JSON the caller supplies, never a view onto what is
 * actually active for any account.
 */
export function PolicySimulator({
  ruleDataJson,
  onRuleDataJsonChange,
  scenarioJson,
  onScenarioJsonChange,
  requestedAmount,
  onRequestedAmountChange,
  submitting,
  error,
  canSubmit,
  onSubmit,
  result,
  className,
}: PolicySimulatorProps) {
  return (
    <div className={className}>
      <ZoneHeading label="Try a policy" />
      <p className={cn(META_CLASS, 'mt-2')}>
        Evaluates a rule set you paste in against a scenario and a requested amount — nothing here
        reads or changes an account&rsquo;s actual, active policy.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Field
          label="Rule data (JSON)"
          multiline
          rows={6}
          value={ruleDataJson}
          onChange={(event) => onRuleDataJsonChange(event.target.value)}
        />
        <Field
          label="Scenario (JSON)"
          multiline
          rows={4}
          value={scenarioJson}
          onChange={(event) => onScenarioJsonChange(event.target.value)}
        />
        <Field
          label="Requested amount (USD)"
          inputMode="decimal"
          value={requestedAmount}
          onChange={(event) => onRequestedAmountChange(event.target.value)}
        />
        {error ? <ErrorLine message={error} /> : null}
        <div>
          <Button type="button" variant="primary" disabled={!canSubmit || submitting} onClick={onSubmit}>
            {submitting ? 'Simulating…' : 'Simulate'}
          </Button>
        </div>
      </div>

      {result ? (
        <div className="border-border mt-5 flex flex-col gap-2 border-t pt-4">
          <div className={LABEL_CLASS}>Decision</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            <dt className={LABEL_CLASS}>Effect</dt>
            <dd className={DATA_INK_CLASS}>{result.effect}</dd>
            <dt className={LABEL_CLASS}>Approved</dt>
            <dd className={DATA_INK_CLASS}>{formatUsd(result.approvedAmount)}</dd>
            <dt className={LABEL_CLASS}>Maximum</dt>
            <dd className={DATA_INK_CLASS}>{formatUsd(result.maximumAmount)}</dd>
            <dt className={LABEL_CLASS}>Policy revision</dt>
            <dd className={DATA_INK_CLASS}>{result.policyRevision}</dd>
            {result.requiredApproverRole ? (
              <>
                <dt className={LABEL_CLASS}>Requires approver</dt>
                <dd className={DATA_INK_CLASS}>{result.requiredApproverRole}</dd>
              </>
            ) : null}
          </dl>
          {result.reasonCodes.length > 0 ? (
            <p className={META_CLASS}>Reason codes: {result.reasonCodes.join(', ')}</p>
          ) : null}
          {result.matchedRuleIds.length > 0 ? (
            <p className={META_CLASS}>Matched rules: {result.matchedRuleIds.join(', ')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
