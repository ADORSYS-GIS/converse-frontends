import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { Field } from '../../components/field';
import { SelectField } from '../../components/select-field';
import type { SelectFieldOption } from '../../components/select-field';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import { createBlankRule, createBlankThreshold, isMoneyField } from './rule-set-validation';
import type {
  ComparisonOperator,
  RuleConditionValue,
  RuleEffect,
  RuleErrors,
  RuleValue,
  RuleSetFormProps,
  ThresholdConditionValue,
  ThresholdField,
} from './types';

/**
 * The typed authoring form for `RuleSet` — replaces the "Rule data (JSON)" textarea
 * `PolicySimulator` used to carry (owner verdict on the old `/settings/refill-options`,
 * verbatim: "very non-human, json-inputs"). Every field here maps one-for-one onto
 * `lightbridge-authz-budget`'s `rule_data.rs::RuleSet` — see `types.ts` for the field-by-field
 * mapping and the one stated scope limit (a flat AND/OR condition list per rule, not the fully
 * recursive tree the wire contract technically allows — see that file's own doc comment).
 *
 * Purely presentational, per the console-ui skill's section contract: typed value + `onChange`,
 * no fetching, no RPC call. `rule-set-validation.ts`'s `toRuleDataJson`/`validateRuleSet` are the
 * pure functions a future `apps/console` container calls around this component — wiring that
 * container is explicitly out of scope for this Storybook-only design batch.
 */
const EFFECT_OPTIONS: SelectFieldOption[] = [
  { value: 'auto_approve', label: 'Auto-approve' },
  { value: 'auto_approve_capped', label: 'Auto-approve, capped' },
  { value: 'manual_review', label: 'Send to manual review' },
  { value: 'deny', label: 'Deny' },
  { value: 'no_action', label: 'No action' },
];

const FIELD_OPTIONS: SelectFieldOption[] = [
  { value: 'self_service_grant_count', label: 'Self-service refills used this period' },
  { value: 'effective_balance_micros', label: 'Effective balance' },
  { value: 'spend_this_period_micros', label: 'Spend this period' },
  { value: 'spend_last_period_micros', label: 'Spend last period' },
  { value: 'requested_amount_micros', label: 'Requested amount' },
];

const OPERATOR_OPTIONS: SelectFieldOption[] = [
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
  { value: 'gt', label: 'is more than' },
  { value: 'gte', label: 'is at least' },
  { value: 'eq', label: 'equals' },
];

const COMBINATOR_OPTIONS: SelectFieldOption[] = [
  { value: 'all', label: 'Match ALL conditions' },
  { value: 'any', label: 'Match ANY condition' },
];

function thresholdValueLabel(field: ThresholdField): string {
  return isMoneyField(field) ? 'Value (USD)' : 'Value (count)';
}

export function RuleSetForm({ value, onChange, errors, className }: RuleSetFormProps) {
  const patch = (next: Partial<typeof value>) => onChange({ ...value, ...next });

  const updateAmount = (index: number, amount: string) => {
    const allowedAmounts = value.allowedAmounts.slice();
    allowedAmounts[index] = amount;
    patch({ allowedAmounts });
  };
  const addAmount = () => patch({ allowedAmounts: [...value.allowedAmounts, ''] });
  const removeAmount = (index: number) =>
    patch({ allowedAmounts: value.allowedAmounts.filter((_, i) => i !== index) });

  const updateRule = (index: number, ruleValue: RuleValue) => {
    const rules = value.rules.slice();
    rules[index] = ruleValue;
    patch({ rules });
  };
  const addRule = () => patch({ rules: [...value.rules, createBlankRule()] });
  const removeRule = (index: number) => patch({ rules: value.rules.filter((_, i) => i !== index) });

  return (
    <div className={className}>
      <ZoneHeading label="Policy rule set" />
      <p className={cn(META_CLASS, 'mt-2')}>
        The rules and amounts a new revision would carry — authored here field by field, never as
        JSON you paste in.
      </p>

      <div className="mt-4 flex flex-col gap-5">
        <Field
          label="Policy revision"
          value={value.policyRevision}
          onChange={(event) => patch({ policyRevision: event.target.value })}
          error={errors?.policyRevision}
        />

        <div className="flex flex-col gap-2">
          <div className={LABEL_CLASS}>Refill ladder</div>
          <p className={META_CLASS}>
            The self-service amounts a caller may request, strictly ascending.
          </p>
          {value.allowedAmounts.map((amount, index) => (
            <div key={index} className="flex items-end gap-2">
              <Field
                label={`Step ${index + 1} (USD)`}
                hideLabel
                inputMode="decimal"
                value={amount}
                onChange={(event) => updateAmount(index, event.target.value)}
                error={errors?.allowedAmounts?.[index]}
                containerClassName="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAmount(index)}
                aria-label={`Remove step ${index + 1}`}>
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={addAmount}>
              + Add step
            </Button>
          </div>
          {errors?.allowedAmountsSummary ? (
            <p className={cn(LABEL_CLASS, 'text-primary')}>{errors.allowedAmountsSummary}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Starting amount (USD)"
            inputMode="decimal"
            value={value.startingAmount}
            onChange={(event) => patch({ startingAmount: event.target.value })}
            error={errors?.startingAmount}
          />
          <Field
            label="Fail-closed floor (USD)"
            inputMode="decimal"
            value={value.failClosedFloorAmount}
            onChange={(event) => patch({ failClosedFloorAmount: event.target.value })}
            error={errors?.failClosedFloorAmount}
          />
        </div>
        <p className={META_CLASS}>
          Starting amount is what a brand-new account begins with; the fail-closed floor is the
          fallback used only when a lookup fails outright — it can never exceed the starting
          amount.
        </p>

        <SelectField
          label="Default effect"
          value={value.defaultEffect}
          options={EFFECT_OPTIONS}
          onChange={(next) => patch({ defaultEffect: next as RuleEffect })}
        />
        <Field
          label="Default reason code"
          value={value.defaultReasonCode}
          onChange={(event) => patch({ defaultReasonCode: event.target.value })}
          error={errors?.defaultReasonCode}
        />

        <div className="flex flex-col gap-4">
          <div className={LABEL_CLASS}>Rules</div>
          <p className={META_CLASS}>
            Evaluated in order — the first whose conditions match wins. Nothing matching falls
            through to the default effect above.
          </p>
          {value.rules.map((rule, index) => (
            <RuleRow
              key={rule.key}
              index={index}
              rule={rule}
              errors={errors?.rules?.[index]}
              onChange={(next) => updateRule(index, next)}
              onRemove={() => removeRule(index)}
            />
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={addRule}>
              + Add rule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RuleRowProps {
  index: number;
  rule: RuleValue;
  errors?: RuleErrors;
  onChange: (rule: RuleValue) => void;
  onRemove: () => void;
}

function RuleRow({ index, rule, errors, onChange, onRemove }: RuleRowProps) {
  const patch = (next: Partial<RuleValue>) => onChange({ ...rule, ...next });

  const updateCondition = (condition: RuleConditionValue) => onChange({ ...rule, condition });
  const updateThreshold = (thresholdIndex: number, threshold: ThresholdConditionValue) => {
    const thresholds = rule.condition.thresholds.slice();
    thresholds[thresholdIndex] = threshold;
    updateCondition({ ...rule.condition, thresholds });
  };
  const addThreshold = () =>
    updateCondition({
      ...rule.condition,
      thresholds: [...rule.condition.thresholds, createBlankThreshold()],
    });
  const removeThreshold = (thresholdIndex: number) =>
    updateCondition({
      ...rule.condition,
      thresholds: rule.condition.thresholds.filter((_, i) => i !== thresholdIndex),
    });

  return (
    <div className="border-border flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className={LABEL_CLASS}>Rule {index + 1}</div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove rule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Rule id"
          value={rule.id}
          onChange={(event) => patch({ id: event.target.value })}
          error={errors?.id}
        />
        <SelectField
          label="Effect"
          value={rule.effect}
          options={EFFECT_OPTIONS}
          onChange={(next) => patch({ effect: next as RuleEffect })}
        />
      </div>

      {rule.effect === 'auto_approve_capped' ? (
        <Field
          label="Cap amount (USD)"
          inputMode="decimal"
          value={rule.capAmount}
          onChange={(event) => patch({ capAmount: event.target.value })}
          error={errors?.capAmount}
        />
      ) : null}

      <Field
        label="Reason code"
        value={rule.reasonCode}
        onChange={(event) => patch({ reasonCode: event.target.value })}
        error={errors?.reasonCode}
      />

      <div className="flex flex-col gap-2">
        <div className={LABEL_CLASS}>Conditions</div>
        {rule.condition.thresholds.length > 1 ? (
          <SelectField
            label="Match"
            value={rule.condition.combinator}
            options={COMBINATOR_OPTIONS}
            onChange={(next) => updateCondition({ ...rule.condition, combinator: next as 'all' | 'any' })}
          />
        ) : null}
        {rule.condition.thresholds.map((threshold, thresholdIndex) => (
          <div key={thresholdIndex} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <SelectField
              label="Field"
              hideLabel
              value={threshold.field}
              options={FIELD_OPTIONS}
              onChange={(next) =>
                updateThreshold(thresholdIndex, { ...threshold, field: next as ThresholdField })
              }
              className="sm:min-w-[220px]"
            />
            <SelectField
              label="Operator"
              hideLabel
              value={threshold.operator}
              options={OPERATOR_OPTIONS}
              onChange={(next) =>
                updateThreshold(thresholdIndex, {
                  ...threshold,
                  operator: next as ComparisonOperator,
                })
              }
              className="sm:min-w-[140px]"
            />
            <Field
              label={thresholdValueLabel(threshold.field)}
              hideLabel
              inputMode="decimal"
              value={threshold.value}
              onChange={(event) =>
                updateThreshold(thresholdIndex, { ...threshold, value: event.target.value })
              }
              error={errors?.thresholds?.[thresholdIndex]?.value}
              containerClassName="min-w-0 flex-1 sm:min-w-[140px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeThreshold(thresholdIndex)}
              aria-label={`Remove condition ${thresholdIndex + 1} of rule ${index + 1}`}>
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={addThreshold}>
            + Add condition
          </Button>
        </div>
      </div>
    </div>
  );
}
