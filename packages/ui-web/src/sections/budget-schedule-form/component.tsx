import React from 'react';

import { cn } from '../../cn';
import { Field } from '../../components/field';
import { InlineStatus } from '../../components/inline-status';
import { SelectField } from '../../components/select-field';
import type { SelectFieldOption } from '../../components/select-field';
import { Toggle } from '../../components/toggle';
import { DAY_OF_MONTH_OPTIONS, WEEKDAY_OPTIONS } from '../../lib/reset-schedule';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import {
  anchorFieldExample,
  budgetScheduleFieldExample,
  CREATED_DISABLED_NOTICE,
  ENABLED_EXPLANATION,
  MODE_EXPLANATIONS,
} from './field-examples';
import { cadenceUsesAnchor, scopeKindUsesScopeId } from './schedule-validation';
import type { BudgetScheduleFormProps, BudgetScheduleFormValue } from './types';

/**
 * The typed authoring form for a budget reset schedule (converse-frontends#451, story C8; backend
 * ADR-0032, lightbridge-authz#653).
 *
 * Purely presentational, per the console-ui skill's section contract: a typed value plus
 * `onChange`, no fetching, no RPC call. `schedule-validation.ts` holds every pure function around
 * it — `validateBudgetSchedule` (mirroring the backend's own constraints),
 * `toBudgetScheduleWire`/`fromStoredBudgetSchedule` (the one crossing point between the form's
 * all-strings value and the wire's `Int?`/i64-string shapes).
 *
 * TWO CONTROLS ARE CONDITIONAL, AND BOTH ARE ABSENT RATHER THAN DISABLED:
 *  - the anchor (weekday / day of month) is not rendered for a `daily` cadence — there is nothing
 *    to anchor to, and a greyed-out picker would invite a reader to wonder what it would mean;
 *  - the scope id is not rendered for a `global` scope — the backend refuses a `global` schedule
 *    that carries one, so offering the field would be offering an invalid state.
 * Their values survive a cadence/scope switch in the caller's state, so flipping weekly → daily →
 * weekly does not silently lose a chosen weekday.
 *
 * The MODE explanations are rendered for BOTH modes at once, always, not just the selected one.
 * The owner's binding Q3 ruling is that a `reset` clamps DOWN as well as up, which is the single
 * most surprising thing about this feature; an operator has to be able to compare the two
 * behaviours before choosing, not after watching a balance fall.
 */

const SCOPE_KIND_OPTIONS: SelectFieldOption[] = [
  { value: 'global', label: 'Every account' },
  { value: 'billing_plan', label: 'Every account on one billing plan' },
  { value: 'account', label: 'One account' },
];

const CADENCE_OPTIONS: SelectFieldOption[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

const MODE_OPTIONS: SelectFieldOption[] = [
  { value: 'reset', label: 'Reset remaining to the amount' },
  { value: 'top_up', label: 'Top up by the amount' },
];

const NO_BILLING_PLANS_OPTION: SelectFieldOption[] = [
  {
    value: '',
    label: 'Loading billing plans…',
    disabled: true,
    reason: 'listBillingPlans has not answered yet',
  },
];

/** The stack every field sits in, and the two-column row the cadence/anchor pair share. */
const STACK_CLASS = 'mt-4 flex flex-col gap-4';
const PAIR_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2';

export function BudgetScheduleForm({
  value,
  onChange,
  errors,
  formMode,
  billingPlans,
  className,
}: BudgetScheduleFormProps) {
  const patch = (next: Partial<BudgetScheduleFormValue>) => onChange({ ...value, ...next });

  const showAnchor = cadenceUsesAnchor(value.cadence);
  const showScopeId = scopeKindUsesScopeId(value.scopeKind);
  const anchorOptions = value.cadence === 'weekly' ? WEEKDAY_OPTIONS : DAY_OF_MONTH_OPTIONS;
  const anchorLabel = value.cadence === 'weekly' ? 'Weekday' : 'Day of month';

  const planOptions: SelectFieldOption[] =
    billingPlans && billingPlans.length > 0
      ? billingPlans.map((plan) => ({ value: plan.id, label: plan.label }))
      : NO_BILLING_PLANS_OPTION;

  return (
    <div className={className}>
      <ZoneHeading label="Schedule" />

      <div className={STACK_CLASS}>
        <Field
          label="Name"
          example={budgetScheduleFieldExample('name')}
          value={value.name}
          error={errors?.name}
          onChange={(event) => patch({ name: event.target.value })}
        />

        <div className={PAIR_CLASS}>
          <SelectField
            label="Applies to"
            example={budgetScheduleFieldExample('scopeKind')}
            value={value.scopeKind}
            options={SCOPE_KIND_OPTIONS}
            onChange={(scopeKind) =>
              patch({ scopeKind: scopeKind as BudgetScheduleFormValue['scopeKind'] })
            }
          />

          {/* Absent, not disabled, for `global` — see the component doc comment. */}
          {showScopeId ? (
            value.scopeKind === 'billing_plan' ? (
              <SelectField
                label="Billing plan"
                example={budgetScheduleFieldExample('scopeKind')}
                value={value.scopeId}
                options={planOptions}
                disabled={!billingPlans || billingPlans.length === 0}
                error={errors?.scopeId}
                onChange={(scopeId) => patch({ scopeId })}
              />
            ) : (
              <Field
                label="Budget account id"
                example={budgetScheduleFieldExample('scopeId')}
                value={value.scopeId}
                error={errors?.scopeId}
                onChange={(event) => patch({ scopeId: event.target.value })}
              />
            )
          ) : null}
        </div>

        <div className={PAIR_CLASS}>
          <SelectField
            label="How often"
            example={budgetScheduleFieldExample('cadence')}
            value={value.cadence}
            options={CADENCE_OPTIONS}
            onChange={(cadence) =>
              patch({ cadence: cadence as BudgetScheduleFormValue['cadence'] })
            }
          />

          {showAnchor ? (
            <SelectField
              label={anchorLabel}
              example={anchorFieldExample(value.cadence)}
              value={value.anchor}
              options={anchorOptions.map((option) => ({ ...option }))}
              error={errors?.anchor}
              onChange={(anchor) => patch({ anchor })}
            />
          ) : null}
        </div>

        <div className={PAIR_CLASS}>
          <Field
            label="Run at (UTC)"
            example={budgetScheduleFieldExample('runAtUtc')}
            value={value.runAtUtc}
            error={errors?.runAtUtc}
            onChange={(event) => patch({ runAtUtc: event.target.value })}
          />

          <Field
            label="Amount (USD)"
            example={budgetScheduleFieldExample('amount')}
            value={value.amount}
            error={errors?.amount}
            inputMode="decimal"
            onChange={(event) => patch({ amount: event.target.value })}
          />
        </div>

        <div>
          <SelectField
            label="What it does"
            example={budgetScheduleFieldExample('mode')}
            value={value.mode}
            options={MODE_OPTIONS}
            onChange={(mode) => patch({ mode: mode as BudgetScheduleFormValue['mode'] })}
          />
          {/* BOTH explanations, always — the reset/top-up difference is the thing an operator
              must compare before choosing, not discover afterwards. */}
          <dl className="mt-2 flex flex-col gap-2">
            {(['reset', 'top_up'] as const).map((mode) => (
              <div key={mode}>
                <dt className={LABEL_CLASS}>{mode === 'reset' ? 'Reset' : 'Top up'}</dt>
                <dd className={cn(META_CLASS)}>{MODE_EXPLANATIONS[mode]}</dd>
              </div>
            ))}
          </dl>
        </div>

        {formMode === 'edit' ? (
          <div>
            <Toggle
              label="Enabled"
              checked={value.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
            />
            <p className={META_CLASS}>{ENABLED_EXPLANATION}</p>
          </div>
        ) : (
          // The create procedure has no `enabled` field at all (`authz.cstack`), so this is a
          // statement of fact about what saving does, not a default a toggle could override.
          <InlineStatus>{CREATED_DISABLED_NOTICE}</InlineStatus>
        )}
      </div>
    </div>
  );
}
