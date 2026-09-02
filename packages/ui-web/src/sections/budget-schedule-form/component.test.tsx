import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BudgetScheduleForm } from './component';
import {
  budgetScheduleBillingPlans,
  budgetScheduleFormDailyGlobal,
  budgetScheduleFormInvalid,
  budgetScheduleFormInvalidErrors,
  budgetScheduleFormMonthlyAccount,
  budgetScheduleFormWeeklyTopUp,
} from './fixtures';
import {
  anchorFieldExample,
  budgetScheduleFieldExample,
  CREATED_DISABLED_NOTICE,
  ENABLED_EXPLANATION,
  MODE_EXPLANATIONS,
} from './field-examples';
import type { BudgetScheduleFormValue } from './types';

function renderForm(
  value: BudgetScheduleFormValue,
  overrides: Partial<React.ComponentProps<typeof BudgetScheduleForm>> = {}
) {
  const onChange = vi.fn();
  const result = render(
    <BudgetScheduleForm
      value={value}
      onChange={onChange}
      formMode="create"
      billingPlans={budgetScheduleBillingPlans}
      {...overrides}
    />
  );
  return { onChange, ...result };
}

describe('BudgetScheduleForm — anchor visibility per cadence', () => {
  it('hides the anchor entirely for a daily cadence', () => {
    renderForm(budgetScheduleFormDailyGlobal);
    expect(screen.queryByLabelText('Weekday')).toBeNull();
    expect(screen.queryByLabelText('Day of month')).toBeNull();
  });

  it('offers the seven ISO weekdays for a weekly cadence', async () => {
    renderForm(budgetScheduleFormWeeklyTopUp);
    const anchor = screen.getByLabelText('Weekday');
    expect(anchor).toHaveTextContent('Monday');

    fireEvent.click(anchor);
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(7);
    expect(options[options.length - 1]).toHaveTextContent('Sunday');
  });

  // The backend constraint, asserted through the UI: a monthly schedule can never be anchored past
  // the 28th, so it can never silently skip February.
  it('caps the day-of-month picker at 28 for a monthly cadence', async () => {
    renderForm(budgetScheduleFormMonthlyAccount);
    const anchor = screen.getByLabelText('Day of month');

    fireEvent.click(anchor);
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(28);
    expect(options[options.length - 1]).toHaveTextContent('28');
    expect(options.map((option) => option.textContent)).not.toContain('29');
  });

  it('renders the anchor’s cadence-dependent example line', () => {
    renderForm(budgetScheduleFormMonthlyAccount);
    expect(screen.getByText(anchorFieldExample('monthly') as string)).toBeInTheDocument();
  });
});

describe('BudgetScheduleForm — scope', () => {
  it('hides the scope-id field for a global schedule', () => {
    renderForm(budgetScheduleFormDailyGlobal);
    expect(screen.queryByLabelText('Billing plan')).toBeNull();
    expect(screen.queryByLabelText('Budget account id')).toBeNull();
  });

  it('shows the billing-plan picker for a plan-scoped schedule', () => {
    renderForm(budgetScheduleFormWeeklyTopUp);
    expect(screen.getByLabelText('Billing plan')).toHaveTextContent('free');
  });

  it('disables the plan picker while the catalogue is still loading', () => {
    renderForm(budgetScheduleFormWeeklyTopUp, { billingPlans: [] });
    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
  });

  it('shows a plain id field for an account-scoped schedule', () => {
    const { onChange } = renderForm(budgetScheduleFormMonthlyAccount);
    const field = screen.getByLabelText('Budget account id');
    expect(field).toHaveValue('acct_c9k2m4x8p1q6r3t7v0w5y2');

    fireEvent.change(field, { target: { value: 'acct_other' } });
    expect(onChange).toHaveBeenCalledWith({
      ...budgetScheduleFormMonthlyAccount,
      scopeId: 'acct_other',
    });
  });
});

describe('BudgetScheduleForm — examples and mode copy', () => {
  it('renders an example line under every field that declares one', () => {
    renderForm(budgetScheduleFormDailyGlobal);
    for (const name of ['name', 'cadence', 'runAtUtc', 'amount', 'mode'] as const) {
      const example = budgetScheduleFieldExample(name);
      expect(example, `${name} has no example`).toBeDefined();
      expect(screen.getAllByText(example as string).length).toBeGreaterThan(0);
    }
  });

  // Both explanations, always — an operator has to compare them before choosing, not discover the
  // clamp-down behaviour after a balance falls.
  it('renders BOTH mode explanations regardless of which mode is selected', () => {
    renderForm(budgetScheduleFormDailyGlobal);
    expect(screen.getByText(MODE_EXPLANATIONS.reset)).toBeInTheDocument();
    expect(screen.getByText(MODE_EXPLANATIONS.top_up)).toBeInTheDocument();
  });
});

describe('BudgetScheduleForm — enabled', () => {
  it('states that a created schedule is saved disabled, with no toggle to override it', () => {
    renderForm(budgetScheduleFormDailyGlobal, { formMode: 'create' });
    expect(screen.getByText(CREATED_DISABLED_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('offers the toggle on the edit route, with its consequence stated', () => {
    const { onChange } = renderForm(budgetScheduleFormWeeklyTopUp, { formMode: 'edit' });
    const toggle = screen.getByRole('switch', { name: 'Enabled' });
    expect(toggle).toBeChecked();
    expect(screen.getByText(ENABLED_EXPLANATION)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ ...budgetScheduleFormWeeklyTopUp, enabled: false });
  });
});

describe('BudgetScheduleForm — validation errors', () => {
  it('renders every field-level message it is handed', () => {
    renderForm(budgetScheduleFormInvalid, { errors: budgetScheduleFormInvalidErrors });
    for (const message of Object.values(budgetScheduleFormInvalidErrors)) {
      expect(screen.getByText(message as string)).toBeInTheDocument();
    }
  });
});
