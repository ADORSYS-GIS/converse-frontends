import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { formatUsd } from '../../lib/money';
import { DATA_INK_CLASS, LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import { RuleSetForm } from '../rule-set-form';
import { ScenarioForm } from '../refill-scenario-form';
import type { PolicySimulatorProps } from './types';

/**
 * `/settings/refill-options`'s own "try a policy" card (IA v3 phase 3, redesigned Phase G — owner
 * verdict on the original: "very non-human, json-inputs"): `procedure.simulateBudgetPolicy`
 * evaluates a rule set the caller authors against a scenario and a requested amount, and returns
 * a `Decision` — it mutates nothing and reads no stored policy, so it is offered to every
 * signed-in user, not gated behind an operator role (the same visibility the "Refill options
 * policies" nav row already carries).
 *
 * The rule set and scenario are now `RuleSetForm`/`ScenarioForm` — typed fields, not JSON
 * textareas. Deliberately still NOT the stored/active policy: `getBudgetPolicyStatus` and the
 * rule content behind it have no read API today (see `REFILL_OPTIONS_DISABLED_REASON`,
 * `client/console-chrome.tsx`) — this card is a scratch pad over a rule set the caller authors
 * here, never a view onto what is actually active for any account.
 */
export function PolicySimulator({
  ruleSet,
  onRuleSetChange,
  ruleSetErrors,
  scenario,
  onScenarioChange,
  scenarioErrors,
  requestedAmount,
  onRequestedAmountChange,
  requestedAmountError,
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
        Evaluates a rule set you author below against a scenario and a requested amount — nothing
        here reads or changes an account&rsquo;s actual, active policy.
      </p>

      <div className="mt-4 flex flex-col gap-6">
        <RuleSetForm value={ruleSet} onChange={onRuleSetChange} errors={ruleSetErrors} />
        <ScenarioForm value={scenario} onChange={onScenarioChange} errors={scenarioErrors} />

        <div className="flex flex-col gap-3">
          <Field
            label="Requested amount (USD)"
            inputMode="decimal"
            value={requestedAmount}
            onChange={(event) => onRequestedAmountChange(event.target.value)}
            error={requestedAmountError}
          />
          {error ? <ErrorLine message={error} /> : null}
          <div>
            <Button type="button" variant="primary" disabled={!canSubmit || submitting} onClick={onSubmit}>
              {submitting ? 'Simulating…' : 'Simulate'}
            </Button>
          </div>
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
