import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CreateProjectDialog } from './component';
import type { CreateProjectPlanOption } from './types';

const PLANS: CreateProjectPlanOption[] = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
  { id: 'enterprise', name: 'Enterprise' },
];

const meta: Meta<typeof CreateProjectDialog> = {
  title: 'Primitives/Overlays/CreateProjectDialog',
  component: CreateProjectDialog,
  args: {
    open: true,
    accountLabel: 'acct_01',
    name: '',
    onNameChange: fn(),
    billingIdentity: '',
    onBillingIdentityChange: fn(),
    plans: PLANS,
    plansLoading: false,
    onRetryPlans: fn(),
    planId: 'pro',
    onPlanChange: fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CreateProjectDialog>;

export const Default: Story = {};

// ADR 0010 phase 4: the `wireframe` (light) counterpart — the dialog portals to `document.body`,
// outside the canvas root the preview decorator wraps, so this confirms the backdrop/panel tokens
// both re-resolve there too.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const RequiredFieldsEmpty: Story = {
  name: 'Empty name/billing identity — submit disabled',
  args: { name: '', billingIdentity: '', canSubmit: false },
};

export const PlansLoading: Story = {
  name: 'Billing plans still loading',
  args: { plans: [], plansLoading: true, planId: null, canSubmit: false },
};

export const PlansFailed: Story = {
  name: 'Billing plans failed — never falls back to a guessed plan',
  args: {
    plans: [],
    plansLoading: false,
    planId: null,
    canSubmit: false,
    plansError: "Couldn't load billing plans.",
  },
};

export const DuplicateName: Story = {
  name: 'Server rejects a duplicate name — surfaced on the field',
  args: {
    name: 'widgets-prod',
    billingIdentity: 'widgets-prod-billing',
    nameError: 'a project named "widgets-prod" already exists on this account',
  },
};

export const DuplicateBillingIdentity: Story = {
  name: 'Server rejects a duplicate billing identity — surfaced on the field',
  args: {
    name: 'widgets-staging',
    billingIdentity: 'widgets-prod-billing',
    billingIdentityError: 'billing identity "widgets-prod-billing" is already in use',
  },
};

export const SubmitFailed: Story = {
  name: 'Stays open with an inline error the caller could not attribute to a field',
  args: {
    name: 'widgets-prod',
    billingIdentity: 'widgets-prod-billing',
    error: 'Something went wrong. Please try again.',
  },
};

export const Submitting: Story = {
  args: {
    name: 'widgets-prod',
    billingIdentity: 'widgets-prod-billing',
    submitting: true,
    canSubmit: true,
  },
};
