import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ManageControls } from './component';
import { manageAccountOptions, manageBudgetStateOptions, manageStatusOptions } from './fixtures';

const meta: Meta<typeof ManageControls> = {
  title: 'Sections/ManageControls',
  component: ManageControls,
  parameters: { layout: 'padded' },
  args: {
    accountValue: 'all',
    accountOptions: manageAccountOptions,
    onAccountChange: () => {},
    statusOptions: manageStatusOptions,
    statusValue: 'all',
    onStatusChange: () => {},
    budgetStateValue: 'all',
    budgetStateOptions: manageBudgetStateOptions,
    onBudgetStateChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ManageControls>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Filtered: Story = {
  args: { statusValue: 'active', budgetStateValue: 'quota-set' },
};

export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};

export const Interactive: Story = {
  render: function Render(args) {
    // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011).
    const [status, setStatus] = useState('all');
    const [budgetState, setBudgetState] = useState('all');
    return (
      <ManageControls
        {...args}
        statusValue={status}
        onStatusChange={setStatus}
        budgetStateValue={budgetState}
        onBudgetStateChange={setBudgetState}
      />
    );
  },
};
