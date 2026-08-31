// Pure logic for `ScenarioForm` — validation and wire serialization — same split from
// `component.tsx` `rule-set-form/rule-set-validation.ts` uses, for the same reason: testable with
// no DOM, reusable by whatever `apps/console` container eventually calls `simulateBudgetPolicy`.

import { dollarsToMicros, parseNonNegativeInt } from '../../lib/parse-amount';
import type { ScenarioErrors, ScenarioValue } from './types';

function serializeSpend(known: boolean, amount: string): unknown {
  if (!known) return { status: 'unavailable' };
  return { status: 'known', amount_micros: dollarsToMicros(amount) };
}

/** The exact `scenarioJson` body `simulateBudgetPolicy` parses with
 *  `serde_json::from_str::<Facts>` — field-for-field snake_case, matching `facts.rs::Facts`. */
export function toScenarioJson(value: ScenarioValue): string {
  return JSON.stringify({
    effective_balance_micros: dollarsToMicros(value.effectiveBalance),
    self_service_grant_count: parseNonNegativeInt(value.selfServiceGrantCount),
    spend_this_period: serializeSpend(value.spendThisPeriodKnown, value.spendThisPeriod),
    spend_last_period: serializeSpend(value.spendLastPeriodKnown, value.spendLastPeriod),
  });
}

/** `Facts` carries no validation of its own beyond "parses as the right shape" — unlike
 *  `RuleSet`, `facts.rs` has no `validate()` function — so this only checks that every entered
 *  amount actually parses, field by field. */
export function validateScenario(value: ScenarioValue): ScenarioErrors | undefined {
  const errors: ScenarioErrors = {};

  if (dollarsToMicros(value.effectiveBalance) === null) {
    errors.effectiveBalance = 'Enter a non-negative amount.';
  }
  if (parseNonNegativeInt(value.selfServiceGrantCount) === null) {
    errors.selfServiceGrantCount = 'Enter a whole number, 0 or greater.';
  }
  if (value.spendThisPeriodKnown && dollarsToMicros(value.spendThisPeriod) === null) {
    errors.spendThisPeriod = 'Enter a non-negative amount, or mark spend unavailable.';
  }
  if (value.spendLastPeriodKnown && dollarsToMicros(value.spendLastPeriod) === null) {
    errors.spendLastPeriod = 'Enter a non-negative amount, or mark spend unavailable.';
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}
