import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { BudgetScheduleForm } from './component';
import {
  budgetScheduleBillingPlans,
  budgetScheduleFormDailyGlobal,
  budgetScheduleFormEmpty,
  budgetScheduleFormForcedWindow,
  budgetScheduleFormInvalid,
  budgetScheduleFormInvalidErrors,
  budgetScheduleFormMonthlyAccount,
  budgetScheduleFormWeeklyTopUp,
} from './fixtures';
import type { BudgetScheduleFormErrors, BudgetScheduleFormValue } from './types';

// The authoring form for a budget reset schedule (converse-frontends#451, story C8).
//
// Every story here is a state the real route can reach: the blank create draft, a filled one, each
// cadence's own anchor variant (hidden / weekday / day-of-month 1–28), the edit route's enabled
// toggle, and every field-level error at once. The wireframe (light) twins exist because the story
// requires both themes.

function Controlled({
  initial,
  errors,
  formMode = 'create',
  billingPlans = budgetScheduleBillingPlans,
  currentNextRunAt,
}: {
  initial: BudgetScheduleFormValue;
  errors?: BudgetScheduleFormErrors;
  formMode?: 'create' | 'edit';
  billingPlans?: typeof budgetScheduleBillingPlans;
  currentNextRunAt?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-[720px] p-6">
      <Card>
        <BudgetScheduleForm
          value={value}
          onChange={setValue}
          errors={errors}
          formMode={formMode}
          billingPlans={billingPlans}
          currentNextRunAt={currentNextRunAt}
        />
      </Card>
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/Budget/BudgetScheduleForm',
  component: Controlled,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Blank: Story = {
  name: 'Blank — the create draft, every field carrying its example',
  args: { initial: budgetScheduleFormEmpty },
};

export const BlankLight: Story = {
  name: 'Blank — wireframe (light)',
  args: { initial: budgetScheduleFormEmpty },
  globals: { theme: 'wireframe' },
};

// "Reset remaining to $2.00 every day at 00:00 UTC", estate-wide — the story's own worked example,
// and the schedule this whole feature exists for.
export const FilledDailyGlobal: Story = {
  name: 'Filled — daily, every account, reset (no anchor field)',
  args: { initial: budgetScheduleFormDailyGlobal },
};

export const FilledDailyGlobalLight: Story = {
  name: 'Filled — daily — wireframe (light)',
  args: { initial: budgetScheduleFormDailyGlobal },
  globals: { theme: 'wireframe' },
};

export const WeeklyTopUp: Story = {
  name: 'Weekly — the weekday anchor, a plan scope, and top-up mode',
  args: { initial: budgetScheduleFormWeeklyTopUp, formMode: 'edit' },
};

export const WeeklyTopUpLight: Story = {
  name: 'Weekly — wireframe (light)',
  args: { initial: budgetScheduleFormWeeklyTopUp, formMode: 'edit' },
  globals: { theme: 'wireframe' },
};

// The day-of-month picker stops at 28 — the backend's own constraint, so a monthly schedule can
// never silently skip February.
export const MonthlyAccount: Story = {
  name: 'Monthly — the 1–28 day anchor and a single-account scope',
  args: { initial: budgetScheduleFormMonthlyAccount, formMode: 'edit' },
};

export const MonthlyAccountLight: Story = {
  name: 'Monthly — wireframe (light)',
  args: { initial: budgetScheduleFormMonthlyAccount, formMode: 'edit' },
  globals: { theme: 'wireframe' },
};

// The create route has no enabled toggle at all — `createBudgetResetSchedule` carries no `enabled`
// field, so a new schedule cannot fire until someone switches it on from the list.
export const CreatedDisabledNotice: Story = {
  name: 'Disabled by default — the create route’s standing notice',
  args: { initial: budgetScheduleFormDailyGlobal, formMode: 'create' },
};

export const Invalid: Story = {
  name: 'Every field-level error at once',
  args: { initial: budgetScheduleFormInvalid, errors: budgetScheduleFormInvalidErrors },
};

export const InvalidLight: Story = {
  name: 'Every field-level error at once — wireframe (light)',
  args: { initial: budgetScheduleFormInvalid, errors: budgetScheduleFormInvalidErrors },
  globals: { theme: 'wireframe' },
};

// The billing-plan picker before `listBillingPlans` has answered: disabled, never an empty menu.
export const PlansStillLoading: Story = {
  name: 'Billing plans still loading — the picker is disabled, not empty',
  args: { initial: budgetScheduleFormWeeklyTopUp, billingPlans: [] },
};

// "Next execution" — the override that forces ONE window onto a date instead of letting the cadence
// pick it (backend ADR-0032's 2026-09-03 amendment). The field is blank on every story above, which
// is the ordinary case; these two are what it looks like in use.
export const ForcedNextExecution: Story = {
  name: 'Next execution — a window forced onto a specific date',
  args: { initial: budgetScheduleFormForcedWindow, formMode: 'edit' },
};

export const ForcedNextExecutionLight: Story = {
  name: 'Next execution — forced — wireframe (light)',
  args: { initial: budgetScheduleFormForcedWindow, formMode: 'edit' },
  globals: { theme: 'wireframe' },
};

// The edit route opens the control EMPTY, because omitting `nextRunAt` is what leaves the stored
// window alone. `currentNextRunAt` is what stops that being a decision made blind.
export const EditKeepsTheStoredWindow: Story = {
  name: 'Next execution — empty on edit, with the stored window stated beside it',
  args: {
    initial: budgetScheduleFormDailyGlobal,
    formMode: 'edit',
    currentNextRunAt: '2026-09-15 09:30 UTC',
  },
};
