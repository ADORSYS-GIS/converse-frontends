// Pure logic for `RuleSetForm` — validation and wire serialization — kept out of `component.tsx`
// so both are testable with no DOM and reusable by whatever `apps/console` container eventually
// calls `activateBudgetPolicy`/`createBudgetPolicyRevision`/`simulateBudgetPolicy` with the
// result (that wiring is out of scope for this Storybook-only batch — see the section's own
// `component.tsx` doc comment).

import { dollarsToMicros, parseNonNegativeInt } from '../../lib/parse-amount';
import type {
  RuleConditionValue,
  RuleErrors,
  RuleSetErrors,
  RuleSetValue,
  RuleValue,
  ThresholdConditionValue,
  ThresholdErrors,
} from './types';

/** A fresh, empty threshold row — the default a `+ Add condition` press inserts. */
export function createBlankThreshold(): ThresholdConditionValue {
  return { field: 'self_service_grant_count', operator: 'lt', value: '' };
}

/** A fresh, empty rule row — the default a `+ Add rule` press inserts. */
export function createBlankRule(): RuleValue {
  return {
    key: generateRowKey(),
    id: '',
    reasonCode: '',
    effect: 'auto_approve',
    capAmount: '',
    condition: { combinator: 'all', thresholds: [createBlankThreshold()] },
  };
}

const MONEY_FIELDS = new Set([
  'effective_balance_micros',
  'spend_this_period_micros',
  'spend_last_period_micros',
  'requested_amount_micros',
]);

/** `true` for the four `_micros` fields (entered as USD), `false` for the one plain-count field. */
export function isMoneyField(field: ThresholdConditionValue['field']): boolean {
  return MONEY_FIELDS.has(field);
}

function parseThresholdValue(threshold: ThresholdConditionValue): number | null {
  return isMoneyField(threshold.field)
    ? dollarsToMicros(threshold.value)
    : parseNonNegativeInt(threshold.value);
}

/** One `Rule`'s wire JSON — `id`/`condition`/`effect`/`reason_code`/`cap_micros`, snake_case,
 *  matching `rule_data.rs::Rule` field-for-field (`cap_micros` omitted entirely for any effect
 *  other than `auto_approve_capped`, the same as the Rust `#[serde(default)]` — sending it
 *  unconditionally would risk a stray cap silently reappearing if a caller ever flips the effect
 *  back). Assumes `value` has already passed `validateRuleSet` — a threshold whose amount fails to
 *  parse serializes as `null`, which the caller must never let happen for real. */
function serializeCondition(condition: RuleConditionValue): unknown {
  const thresholds = condition.thresholds.map((threshold) => ({
    type: 'threshold',
    field: threshold.field,
    operator: threshold.operator,
    value: parseThresholdValue(threshold),
  }));
  if (thresholds.length === 1) return thresholds[0];
  return { type: condition.combinator, conditions: thresholds };
}

function serializeRule(rule: RuleValue): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    id: rule.id,
    condition: serializeCondition(rule.condition),
    effect: rule.effect,
    reason_code: rule.reasonCode,
  };
  if (rule.effect === 'auto_approve_capped') {
    wire.cap_micros = dollarsToMicros(rule.capAmount);
  }
  return wire;
}

/** The exact `ruleDataJson` body `activateBudgetPolicy`/`createBudgetPolicyRevision`/
 *  `simulateBudgetPolicy` parse with `serde_json::from_str::<RuleSet>` — field-for-field
 *  snake_case, matching `rule_data.rs::RuleSet`. */
export function toRuleDataJson(value: RuleSetValue): string {
  return JSON.stringify({
    policy_revision: value.policyRevision,
    rules: value.rules.map(serializeRule),
    default_effect: value.defaultEffect,
    default_reason_code: value.defaultReasonCode,
    allowed_amounts_micros: value.allowedAmounts.map((amount) => dollarsToMicros(amount)),
    starting_amount_micros: dollarsToMicros(value.startingAmount),
    fail_closed_floor_micros: dollarsToMicros(value.failClosedFloorAmount),
  });
}

function validateThreshold(threshold: ThresholdConditionValue): ThresholdErrors | undefined {
  const parsed = parseThresholdValue(threshold);
  if (parsed === null) {
    return { value: isMoneyField(threshold.field) ? 'Enter a non-negative amount.' : 'Enter a whole number, 0 or greater.' };
  }
  return undefined;
}

function validateRule(rule: RuleValue): RuleErrors | undefined {
  const errors: RuleErrors = {};
  if (rule.id.trim() === '') errors.id = 'Rule id must not be empty.';
  if (rule.reasonCode.trim() === '') errors.reasonCode = 'Reason code must not be empty.';
  if (rule.effect === 'auto_approve_capped' && dollarsToMicros(rule.capAmount) === null) {
    errors.capAmount = 'Enter a non-negative cap amount.';
  }
  const thresholdErrors = rule.condition.thresholds.map(validateThreshold);
  if (thresholdErrors.some(Boolean)) errors.thresholds = thresholdErrors;

  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * Client-side mirror of `lightbridge_authz_budget::rule_data::validate` — every check that
 * function makes against a parsed `RuleSet`, run here against the typed form value before it is
 * ever serialized. Kept in sync BY COMMENT, the same discipline `rule_data.rs`'s own doc comment
 * states for its migration-seed twin — there is no shared crate a TypeScript form and a Rust
 * validator could both depend on.
 *
 *  - `policy_revision`/`default_reason_code`/rule `id`/rule `reason_code` must not be empty.
 *  - Rule ids must be unique.
 *  - `allowed_amounts_micros` must be non-empty, positive, unique, and strictly ascending.
 *  - `starting_amount_micros`/`fail_closed_floor_micros` must be positive.
 *  - `fail_closed_floor_micros` must not exceed `starting_amount_micros`.
 *
 * Returns `undefined` when the value is clean — the same "absent means no error" contract
 * `RuleSetErrors` documents.
 */
export function validateRuleSet(value: RuleSetValue): RuleSetErrors | undefined {
  const errors: RuleSetErrors = {};

  if (value.policyRevision.trim() === '') errors.policyRevision = 'Policy revision must not be empty.';
  if (value.defaultReasonCode.trim() === '') {
    errors.defaultReasonCode = 'Default reason code must not be empty.';
  }

  const amountErrors: (string | undefined)[] = value.allowedAmounts.map((amount) => {
    const parsed = dollarsToMicros(amount);
    return parsed === null || parsed <= 0 ? 'Enter a positive amount.' : undefined;
  });
  if (amountErrors.some(Boolean)) errors.allowedAmounts = amountErrors;

  if (value.allowedAmounts.length === 0) {
    errors.allowedAmountsSummary = 'Add at least one refill step.';
  } else if (!amountErrors.some(Boolean)) {
    const parsedAmounts = value.allowedAmounts.map((amount) => dollarsToMicros(amount) as number);
    const seen = new Set<number>();
    let ascending = true;
    let duplicate = false;
    let previous: number | undefined;
    for (const amount of parsedAmounts) {
      if (seen.has(amount)) duplicate = true;
      seen.add(amount);
      if (previous !== undefined && amount <= previous) ascending = false;
      previous = amount;
    }
    if (duplicate) errors.allowedAmountsSummary = 'Refill steps must be unique.';
    else if (!ascending) errors.allowedAmountsSummary = 'Refill steps must be strictly ascending.';
  }

  const startingMicros = dollarsToMicros(value.startingAmount);
  if (startingMicros === null || startingMicros <= 0) {
    errors.startingAmount = 'Enter a positive starting amount.';
  }
  const floorMicros = dollarsToMicros(value.failClosedFloorAmount);
  if (floorMicros === null || floorMicros <= 0) {
    errors.failClosedFloorAmount = 'Enter a positive fail-closed floor.';
  } else if (startingMicros !== null && floorMicros > startingMicros) {
    errors.failClosedFloorAmount =
      'The fail-closed floor must not exceed the starting amount — an outage must never grant more than a new signup would get.';
  }

  const ruleIds = new Set<string>();
  const ruleErrors: (RuleErrors | undefined)[] = value.rules.map((rule) => {
    const own = validateRule(rule);
    if (rule.id.trim() !== '' && ruleIds.has(rule.id.trim())) {
      return { ...own, id: 'Rule id must be unique.' };
    }
    if (rule.id.trim() !== '') ruleIds.add(rule.id.trim());
    return own;
  });
  if (ruleErrors.some(Boolean)) errors.rules = ruleErrors;

  return Object.keys(errors).length > 0 ? errors : undefined;
}

/** A fresh client-side key for a new repeater row — `RuleSetValue.rules[].key` is never sent over
 *  the wire, so it only has to be unique within one mounted form. */
export function generateRowKey(): string {
  return crypto.randomUUID();
}

/** A blank first-run `RuleSetValue` — the real starting draft `apps/console`'s create/edit/
 *  simulate containers mount `RuleSetForm` against (never the fixtures under `fixtures.ts`, which
 *  are Storybook/test-only). One empty ladder step, no rules, matching `fixtures.ts`'s own
 *  `ruleSetFormEmpty` shape byte-for-byte — kept as a separate runtime export rather than
 *  importing the fixture into production code. */
export function createBlankRuleSet(): RuleSetValue {
  return {
    policyRevision: '',
    rules: [],
    defaultEffect: 'manual_review',
    defaultReasonCode: '',
    allowedAmounts: [''],
    startingAmount: '',
    failClosedFloorAmount: '',
  };
}
