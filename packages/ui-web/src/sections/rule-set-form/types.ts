// Typed authoring form for `RuleSet` — the JSON body `activateBudgetPolicy.ruleDataJson`,
// `createBudgetPolicyRevision.ruleDataJson` and `simulateBudgetPolicy.ruleDataJson` all carry
// (`packages/authz-rpc/schema/authz.cstack`; the Rust shape is
// `lightbridge-authz-budget`'s `rule_data.rs::RuleSet`). Every field below is a REAL field of that
// wire contract, named for what it is rather than restating the JSON key — `rule-set-serialize.ts`
// is the one place that maps back to the exact JSON shape the backend's `validate_rule_data`
// parses.
//
// SCOPE NOTE (owner-visible, not a silent gap): `Condition` is recursive in the real contract
// (`Threshold | All { conditions: Condition[] } | Any { conditions: Condition[] }`, arbitrary
// depth). This form represents one level of that tree per rule — a flat list of `Threshold`
// conditions combined by a single top-level `all`/`any` combinator — which is the entire shape
// every rule in this codebase's own fixtures and the shipped default policy actually use (see
// `default_rule_set_json()` in `rule_data.rs`: one bare `Threshold` per rule, no nesting anywhere
// in the test suite either). A rule that genuinely needs `All` nested inside `Any` is not
// representable here; that is a real, stated limitation of the human form, not a fabricated
// completeness.

/** `Field` (`rule_data.rs`) — what a threshold condition compares. The four `_micros` members are
 *  money, entered in the form as USD and converted at submit time (`parse-amount.ts`); the count
 *  member is a plain non-negative integer. */
export type ThresholdField =
  | 'self_service_grant_count'
  | 'effective_balance_micros'
  | 'spend_this_period_micros'
  | 'spend_last_period_micros'
  | 'requested_amount_micros';

/** `Operator` (`rule_data.rs`), verbatim. */
export type ComparisonOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

/** `Effect` (`decision.rs`), verbatim — the snake_case wire value both `Rule.effect` and
 *  `RuleSet.default_effect` carry. */
export type RuleEffect = 'auto_approve' | 'auto_approve_capped' | 'manual_review' | 'deny' | 'no_action';

/** One `Condition::Threshold` — always typed as USD text for a money field, a plain integer text
 *  for the grant-count field; `rule-set-serialize.ts` decides which conversion applies from
 *  `field` alone. */
export interface ThresholdConditionValue {
  field: ThresholdField;
  operator: ComparisonOperator;
  value: string;
}

/** A rule's whole condition: a flat list of thresholds plus how they combine. `combinator` is
 *  meaningless (and hidden by the form) when there is exactly one threshold — a single condition
 *  serializes as a bare `Threshold`, matching the shape every real rule in this codebase uses. */
export interface RuleConditionValue {
  combinator: 'all' | 'any';
  thresholds: ThresholdConditionValue[];
}

/** One `Rule` (`rule_data.rs`). `capAmount` is only read when `effect === 'auto_approve_capped'`
 *  — `Rule.cap_micros` is `#[serde(default)]` and ignored for every other effect. */
export interface RuleValue {
  /** A stable client-side key for React/reordering — never sent over the wire. */
  key: string;
  id: string;
  reasonCode: string;
  effect: RuleEffect;
  capAmount: string;
  condition: RuleConditionValue;
}

/** The whole `RuleSet` a caller authors — `policy_revision` down to `fail_closed_floor_micros`,
 *  field-for-field. `allowedAmounts` is the self-service refill ladder
 *  (`allowed_amounts_micros`): strictly ascending, positive, unique dollar amounts. */
export interface RuleSetValue {
  policyRevision: string;
  rules: RuleValue[];
  defaultEffect: RuleEffect;
  defaultReasonCode: string;
  allowedAmounts: string[];
  startingAmount: string;
  failClosedFloorAmount: string;
}

/** Field-level validation errors, shaped to match `RuleSetValue` one-for-one so the component can
 *  point each message at the exact control it belongs to. `undefined`/absent means that field (or
 *  that indexed row) has no error. Mirrors `lightbridge-authz-budget::rule_data::validate`
 *  client-side — see `rule-set-validation.ts` for the one place both sides' rules are kept in
 *  sync by comment, not by a shared crate. */
export interface RuleSetErrors {
  policyRevision?: string;
  defaultReasonCode?: string;
  allowedAmounts?: (string | undefined)[];
  /** A cross-row error that isn't any one row's own fault (a duplicate, a non-ascending pair) —
   *  rendered once beneath the ladder rather than duplicated onto both offending rows. */
  allowedAmountsSummary?: string;
  startingAmount?: string;
  failClosedFloorAmount?: string;
  rules?: (RuleErrors | undefined)[];
}

export interface RuleErrors {
  id?: string;
  reasonCode?: string;
  capAmount?: string;
  thresholds?: (ThresholdErrors | undefined)[];
}

export interface ThresholdErrors {
  value?: string;
}

export interface RuleSetFormProps {
  value: RuleSetValue;
  onChange: (value: RuleSetValue) => void;
  errors?: RuleSetErrors;
  className?: string;
}
