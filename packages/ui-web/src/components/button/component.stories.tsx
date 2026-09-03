import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './component';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Actions/Button',
  component: Button,
  args: {
    children: 'Continue',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Primary` -- text must resolve to
// `primary-content` (`#FFFFFF` in light, AA against `#B4441C`), not `ink`.
export const PrimaryLight: Story = {
  name: 'Primary — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { variant: 'primary' },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
    </div>
  ),
};

// The compact-tier contextual sheet trigger: 30×30, ghost, icon-only — always with an explicit
// `aria-label` since there is no visible text (console-ui skill, 2026-08-25 revision).
export const IconTrigger: Story = {
  render: () => (
    <Button type="button" variant="ghost" size="icon" aria-label="Open filters">
      <svg
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true">
        <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
      </svg>
    </Button>
  ),
};
