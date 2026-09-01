import type { RuleSetErrors, RuleSetValue } from '../rule-set-form';
import type { ScenarioErrors, ScenarioValue } from '../refill-scenario-form';

/** `procedure.simulateBudgetPolicy`'s own `Decision` response, adapted for display: money
 *  converted to major units once, by the container, from the wire's integer-micros strings. */
export interface PolicySimulationResult {
  effect: string;
  approvedAmount: number;
  maximumAmount: number;
  reasonCodes: string[];
  matchedRuleIds: string[];
  policyRevision: string;
  /** `Decision.obligations.requiredApproverRole` — `null`/absent means no obligation attached. */
  requiredApproverRole?: string | null;
}

export interface PolicySimulatorProps {
  ruleSet: RuleSetValue;
  onRuleSetChange: (value: RuleSetValue) => void;
  /** Field-level validation for `ruleSet` — computed by the container via
   *  `rule-set-form`'s `validateRuleSet`, so this stays a presentational prop rather than the
   *  section re-running validation on every render for its own JSX. */
  ruleSetErrors?: RuleSetErrors;
  scenario: ScenarioValue;
  onScenarioChange: (value: ScenarioValue) => void;
  scenarioErrors?: ScenarioErrors;
  /** Dollars, as typed — converted to micros by the container immediately before the call. */
  requestedAmount: string;
  onRequestedAmountChange: (value: string) => void;
  requestedAmountError?: string;
  submitting: boolean;
  /** A submit-time failure — the call itself failing (no local parse errors reach here; those are
   *  `ruleSetErrors`/`scenarioErrors`/`requestedAmountError` instead). */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  /** The last successful simulation's result. `undefined` before the first run, or after an
   *  input changes and the previous result no longer describes what's on screen (the container's
   *  own call to decide when to clear it). */
  result?: PolicySimulationResult;
  className?: string;
}
