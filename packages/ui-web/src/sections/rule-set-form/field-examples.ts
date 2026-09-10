// The one source of every "e.g. …" line the refill-policy form shows (issue #445).
//
// WHY A TABLE AND NOT A STRING PER CALL SITE: an example typed inline beside its `<Field>` is
// invisible to the compiler, so the next field added to this form would simply have none and
// nobody would notice. `RuleSetFieldName` is the closed union of every authorable slot on the
// form (plus `policySetId`, which the create ROUTE owns rather than this section — see below), and
// `RULE_SET_FIELD_EXAMPLES` is a `Record` over that union: adding a member to the union without
// adding its entry is a type error, and `field-examples.test.ts` asserts every entry is either a
// real example or an omission WITH a stated reason. Examples are documentation that cannot rot
// silently, which is the whole point of the story.
//
// `policySetId` is in this table even though `RuleSetForm` does not render it: the field lives on
// `/admin/refill-policies/create` (`RefillPolicyFormView`, apps/console) beside this form, and the
// two would drift apart the moment they had two homes.

/** Every authorable slot on the refill-policy create/edit surface. */
export type RuleSetFieldName =
  | 'policySetId'
  | 'policyRevision'
  | 'allowedAmounts'
  | 'startingAmount'
  | 'failClosedFloorAmount'
  | 'defaultEffect'
  | 'defaultReasonCode'
  | 'ruleId'
  | 'ruleEffect'
  | 'ruleCapAmount'
  | 'ruleReasonCode'
  | 'ruleCondition'
  | 'thresholdField'
  | 'thresholdOperator'
  | 'thresholdValue';

/** Either the line a field shows, or a stated reason it deliberately shows none. There is no
 *  third case — a field cannot be silently example-less. */
export type FieldExample = { readonly example: string } | { readonly omitted: string };

const CONDITION_EXAMPLE = 'e.g. self_service_grant_count ≥ 3 → manual_review';

/**
 * The three threshold controls render with hidden labels inside one wrapping row (`hideLabel`, a
 * deliberate phase-9 decision — a picker whose chosen option reads "Self-service refills used this
 * period" does not also need the word "Field" beside it). An example line needs a label to sit
 * under; these have none on screen, and three muted lines wedged into an `items-end` row would
 * break the row's own alignment. Their example is the `ruleCondition` line above the row, which
 * spells out all three parts of a condition in one readable sentence.
 */
const COVERED_BY_CONDITION_LINE =
  'Rendered with a hidden label inside the condition row — covered by the ruleCondition example above that row.';

export const RULE_SET_FIELD_EXAMPLES: Readonly<Record<RuleSetFieldName, FieldExample>> = {
  policySetId: { example: 'e.g. budget-refill-2026-09' },
  policyRevision: { example: 'e.g. budget-refill-2026-09-r1' },
  allowedAmounts: { example: 'e.g. 2, 5, 10, 25' },
  startingAmount: { example: 'e.g. 2' },
  failClosedFloorAmount: { example: 'e.g. 1 — never above the starting amount' },
  defaultEffect: { example: 'e.g. Send to manual review, when no rule below matches' },
  defaultReasonCode: { example: 'e.g. unaided_allowance_exhausted' },
  ruleId: { example: 'e.g. within-unaided-allowance' },
  ruleEffect: { example: 'e.g. Auto-approve, capped' },
  ruleCapAmount: { example: 'e.g. 10' },
  ruleReasonCode: { example: 'e.g. within_unaided_allowance' },
  ruleCondition: { example: CONDITION_EXAMPLE },
  thresholdField: { omitted: COVERED_BY_CONDITION_LINE },
  thresholdOperator: { omitted: COVERED_BY_CONDITION_LINE },
  thresholdValue: { omitted: COVERED_BY_CONDITION_LINE },
};

/** The line to hand a `Field`/`SelectField`'s `example` prop — `undefined` for a slot whose
 *  omission the table states a reason for. */
export function ruleSetFieldExample(name: RuleSetFieldName): string | undefined {
  const entry = RULE_SET_FIELD_EXAMPLES[name];
  return 'example' in entry ? entry.example : undefined;
}
