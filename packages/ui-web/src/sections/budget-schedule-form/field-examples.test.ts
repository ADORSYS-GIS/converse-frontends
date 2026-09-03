import { describe, expect, it } from 'vitest';

import {
  anchorFieldExample,
  BUDGET_SCHEDULE_FIELD_EXAMPLES,
  budgetScheduleFieldExample,
  currentNextRunExample,
  MODE_EXPLANATIONS,
  NEXT_RUN_AT_EXPLANATION,
} from './field-examples';
import type { BudgetScheduleFieldName } from './field-examples';

// Same contract `rule-set-form/field-examples.test.ts` pins: the union is closed and the table is a
// `Record` over it, so "a field with no entry" is a compile error. What a test can catch is an
// entry that exists but says nothing.
const NAMES = Object.keys(BUDGET_SCHEDULE_FIELD_EXAMPLES) as BudgetScheduleFieldName[];

describe('BUDGET_SCHEDULE_FIELD_EXAMPLES', () => {
  it('declares an example or an explicit, reasoned omission for every field', () => {
    for (const name of NAMES) {
      const entry = BUDGET_SCHEDULE_FIELD_EXAMPLES[name];
      if ('example' in entry) {
        expect(entry.example.trim(), `${name} has an empty example`).not.toBe('');
        expect(entry.example, `${name} does not read as an example`).toMatch(/^e\.g\. /);
      } else {
        expect(entry.omitted.trim(), `${name} omits an example without saying why`).not.toBe('');
      }
    }
  });

  it('covers every field the form renders', () => {
    expect(new Set(NAMES)).toEqual(
      new Set<BudgetScheduleFieldName>([
        'name',
        'scopeKind',
        'scopeId',
        'cadence',
        'anchor',
        'runAtUtc',
        'amount',
        'nextRunAt',
        'mode',
        'enabled',
      ])
    );
  });

  it('returns undefined for a slot whose omission is stated, never an empty string', () => {
    expect(budgetScheduleFieldExample('anchor')).toBeUndefined();
    expect(budgetScheduleFieldExample('enabled')).toBeUndefined();
  });

  // The run-time example has to name UTC: an operator reading a local time off this form would
  // author a schedule that fires hours from where they think.
  it('says UTC on the run-time example', () => {
    expect(budgetScheduleFieldExample('runAtUtc')).toContain('UTC');
  });

  // Same reason, and one more: the forced window is refused by the backend unless it is in the
  // future, so the example has to say that before the operator submits.
  it('says UTC and "future" on the forced-window example', () => {
    const example = budgetScheduleFieldExample('nextRunAt');
    expect(example).toContain('UTC');
    expect(example).toContain('future');
  });
});

describe('anchorFieldExample', () => {
  it('is cadence-dependent, and absent for daily', () => {
    expect(anchorFieldExample('daily')).toBeUndefined();
    expect(anchorFieldExample('weekly')).toContain('Monday');
    expect(anchorFieldExample('monthly')).toContain('28');
  });
});

describe('MODE_EXPLANATIONS', () => {
  // The owner's binding Q3 ruling — a reset CLAMPS DOWN as well as up — has to be stated in the
  // copy, not just implemented. This is the acceptance criterion, asserted.
  it('states that a reset lowers an over-funded account as well as raising an under-funded one', () => {
    expect(MODE_EXPLANATIONS.reset).toMatch(/raises/i);
    expect(MODE_EXPLANATIONS.reset).toMatch(/lowers/i);
    expect(MODE_EXPLANATIONS.reset).toMatch(/refund/i);
  });

  it('states that a top up never lowers a balance', () => {
    expect(MODE_EXPLANATIONS.top_up).toMatch(/never lowers/i);
  });
});

describe('the forced-window copy', () => {
  // The one thing the control itself cannot say: forcing a date is a ONE-OFF, not a permanent move
  // to a new grid. If this sentence goes, an operator forcing a Tuesday reasonably expects every
  // following window on a Tuesday — which is not what the scheduler does.
  it('states that a forced window applies once and then the cadence resumes', () => {
    expect(NEXT_RUN_AT_EXPLANATION).toMatch(/once/i);
    expect(NEXT_RUN_AT_EXPLANATION).toMatch(/back to its normal cadence/i);
  });

  it('tells the edit route what is stored today and that blank keeps it', () => {
    const line = currentNextRunExample('2026-09-15 09:30 UTC');
    expect(line).toContain('2026-09-15 09:30 UTC');
    expect(line).toMatch(/leave blank to keep it/i);
  });
});
