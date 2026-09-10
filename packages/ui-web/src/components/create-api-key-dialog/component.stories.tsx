import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CreateApiKeyDialog } from './component';
import type { CreateApiKeyPlanOption } from './types';

const PLANS: CreateApiKeyPlanOption[] = [
  { id: 'free', name: 'Free', limits: { requestsPerSecond: 2, requestsPerDay: 500 } },
  { id: 'pro', name: 'Pro', limits: { requestsPerSecond: 20, requestsPerDay: 50_000 } },
  { id: 'enterprise', name: 'Enterprise', limits: null },
];

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '89', label: '89 days' },
];

const PROJECT_OPTIONS = [
  { value: 'proj_default', label: 'Default Project' },
  { value: 'proj_gateway', label: 'gateway-prod' },
];

const meta: Meta<typeof CreateApiKeyDialog> = {
  title: 'Primitives/Overlays/CreateApiKeyDialog',
  component: CreateApiKeyDialog,
  args: {
    open: true,
    projectOptions: PROJECT_OPTIONS,
    projectId: 'proj_default',
    onProjectChange: fn(),
    name: '',
    onNameChange: fn(),
    expiryDays: '30',
    expiryOptions: EXPIRY_OPTIONS,
    onExpiryDaysChange: fn(),
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
type Story = StoryObj<typeof CreateApiKeyDialog>;

export const Default: Story = {};

// ADR 0010 phase 4: the `wireframe` (light) counterpart — the dialog portals to `document.body`,
// outside the canvas root the preview decorator wraps, so this confirms the backdrop/panel tokens
// both re-resolve there too.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const EnterpriseNoLimits: Story = {
  name: 'Selected plan has no configured limits',
  args: { planId: 'enterprise' },
};

export const ProjectIneligible: Story = {
  name: 'Selected project cannot take a new key — reason stated, not a silent disable',
  args: {
    projectId: 'proj_gateway',
    projectReason: 'Only the project owner or a lead can create keys here.',
    canSubmit: false,
  },
};

export const NameRequired: Story = {
  name: 'Empty name — submit disabled',
  args: { name: '', canSubmit: false },
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

export const SubmitFailed: Story = {
  name: 'Stays open with an inline error on failure',
  args: {
    name: 'ci-deploy',
    error:
      "unknown billing_plan 'standard': must be one of the configured plans [free, pro, enterprise]",
  },
};

export const Submitting: Story = {
  args: { name: 'ci-deploy', submitting: true, canSubmit: true },
};
