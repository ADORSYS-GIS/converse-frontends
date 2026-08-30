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
  ruleDataJson: string;
  onRuleDataJsonChange: (value: string) => void;
  scenarioJson: string;
  onScenarioJsonChange: (value: string) => void;
  /** Dollars, as typed — converted to micros by the container immediately before the call. */
  requestedAmount: string;
  onRequestedAmountChange: (value: string) => void;
  submitting: boolean;
  /** A submit-time failure — a malformed JSON body, or the call itself failing. */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  /** The last successful simulation's result. `undefined` before the first run, or after an
   *  input changes and the previous result no longer describes what's on screen (the container's
   *  own call to decide when to clear it). */
  result?: PolicySimulationResult;
  className?: string;
}
