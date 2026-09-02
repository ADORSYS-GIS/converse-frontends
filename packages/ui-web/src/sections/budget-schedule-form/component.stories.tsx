import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { BudgetScheduleForm } from './component';
import {
  budgetScheduleBillingPlans,
  budgetScheduleFormDailyGlobal,
  budgetScheduleFormEmpty,
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
}: {
  initial: BudgetScheduleFormValue;
  errors?: BudgetScheduleFormErrors;
  formMode?: 'create' | 'edit';
  billingPlans?: typeof budgetScheduleBillingPlans;
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
        />
      </Card>
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/BudgetScheduleForm',
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
