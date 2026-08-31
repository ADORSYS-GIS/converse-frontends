// Typed authoring form for `simulateBudgetPolicy`'s `scenarioJson` — the JSON-encoded `Facts`
// value (`lightbridge-authz-budget`'s `facts.rs::Facts`) the simulator evaluates a proposed rule
// set against. Four real fields, field-for-field:
//
//  - `effective_balance_micros` — money, entered as USD.
//  - `self_service_grant_count` — a plain non-negative integer.
//  - `spend_this_period` / `spend_last_period` — `Spend`, an adjacently-tagged
//    `{ status: 'known', amount_micros } | { status: 'unavailable' }` (see `spend.rs`'s own doc
//    comment for the exact wire shape and why the distinction is never collapsed to zero). Modeled
//    here as a boolean "known" toggle plus the USD amount it gates — never a free-text status
//    string, since `known`/`unavailable` is the entire closed set.

export interface ScenarioValue {
  effectiveBalance: string;
  selfServiceGrantCount: string;
  spendThisPeriodKnown: boolean;
  spendThisPeriod: string;
  spendLastPeriodKnown: boolean;
  spendLastPeriod: string;
}

export interface ScenarioErrors {
  effectiveBalance?: string;
  selfServiceGrantCount?: string;
  spendThisPeriod?: string;
  spendLastPeriod?: string;
}

export interface ScenarioFormProps {
  value: ScenarioValue;
  onChange: (value: ScenarioValue) => void;
  errors?: ScenarioErrors;
  className?: string;
}
