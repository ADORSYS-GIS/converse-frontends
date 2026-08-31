import React from 'react';

import { cn } from '../../cn';
import { Checkbox } from '../../components/checkbox';
import { Field } from '../../components/field';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import type { ScenarioFormProps } from './types';

/**
 * The typed authoring form for `simulateBudgetPolicy`'s `scenarioJson` — replaces the "Scenario
 * (JSON)" textarea `PolicySimulator` used to carry. Four real `Facts` fields (`facts.rs`), see
 * `types.ts` for the field-by-field mapping. `spend_this_period`/`spend_last_period`'s
 * known/unavailable distinction (`spend.rs`) is a `Checkbox`, not a free-text status — the two
 * states are the entire set, and unavailable must never be confused with "spent $0".
 */
export function ScenarioForm({ value, onChange, errors, className }: ScenarioFormProps) {
  const patch = (next: Partial<typeof value>) => onChange({ ...value, ...next });

  return (
    <div className={className}>
      <ZoneHeading label="Scenario" />
      <p className={cn(META_CLASS, 'mt-2')}>
        The account state to evaluate the rule set above against — nothing here reads a real
        account.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Effective balance (USD)"
            inputMode="decimal"
            value={value.effectiveBalance}
            onChange={(event) => patch({ effectiveBalance: event.target.value })}
            error={errors?.effectiveBalance}
          />
          <Field
            label="Self-service refills used this period"
            inputMode="numeric"
            value={value.selfServiceGrantCount}
            onChange={(event) => patch({ selfServiceGrantCount: event.target.value })}
            error={errors?.selfServiceGrantCount}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className={LABEL_CLASS}>Spend this period</div>
          <Checkbox
            label="Known"
            checked={value.spendThisPeriodKnown}
            onCheckedChange={(checked) => patch({ spendThisPeriodKnown: checked })}
          />
          {value.spendThisPeriodKnown ? (
            <Field
              label="Spend this period (USD)"
              hideLabel
              inputMode="decimal"
              value={value.spendThisPeriod}
              onChange={(event) => patch({ spendThisPeriod: event.target.value })}
              error={errors?.spendThisPeriod}
            />
          ) : (
            <p className={META_CLASS}>
              Treated as unavailable — a policy referencing this fact fails closed to manual
              review, never to $0 spent.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className={LABEL_CLASS}>Spend last period</div>
          <Checkbox
            label="Known"
            checked={value.spendLastPeriodKnown}
            onCheckedChange={(checked) => patch({ spendLastPeriodKnown: checked })}
          />
          {value.spendLastPeriodKnown ? (
            <Field
              label="Spend last period (USD)"
              hideLabel
              inputMode="decimal"
              value={value.spendLastPeriod}
              onChange={(event) => patch({ spendLastPeriod: event.target.value })}
              error={errors?.spendLastPeriod}
            />
          ) : (
            <p className={META_CLASS}>
              Treated as unavailable — a policy referencing this fact fails closed to manual
              review, never to $0 spent.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
