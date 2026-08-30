import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { RequestRefillDialog } from './component';

const AMOUNT_OPTIONS = [
  { value: '5000000', label: '+$5.00' },
  { value: '12000000', label: '+$12.00' },
  { value: '50000000', label: '+$50.00' },
];

const meta: Meta<typeof RequestRefillDialog> = {
  title: 'Forms & actions/RequestRefillDialog',
  component: RequestRefillDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    accountLabel: 'adorsys-gis',
    amountOptions: AMOUNT_OPTIONS,
    amountMicros: AMOUNT_OPTIONS[0].value,
    onAmountChange: fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RequestRefillDialog>;

/** The smallest allowed amount preselected — the same default whichever of the three standing
 *  triggers opened this (header action, breach button, rail quick-settings row). */
export const Default: Story = {};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Submitting: Story = {
  name: 'In-flight submit',
  args: { submitting: true },
};

export const ServerRejected: Story = {
  name: 'Server-rejected submit',
  args: { error: 'The active refill policy no longer allows this amount.' },
};

export const NoAllowedAmounts: Story = {
  name: 'The policy currently offers nothing — nothing to select, nothing to submit',
  args: { amountOptions: [], amountMicros: '', canSubmit: false },
};
