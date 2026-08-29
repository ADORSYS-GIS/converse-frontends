import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { BudgetHero } from './component';

const meta: Meta<typeof BudgetHero> = {
  title: 'Data display/BudgetHero',
  component: BudgetHero,
};

export default meta;
type Story = StoryObj<typeof BudgetHero>;

// overview.svg — account-level hero, well under ceiling, no action needed.
export const UnderCeiling: Story = {
  args: {
    value: 142.55,
    ceiling: 500,
    caption: 'account ceiling · 28% used · resets 01 Mar',
  },
};

// overview.svg NEEDS ATTENTION block — gateway-prod at 91%, breached meter + inline refill CTA.
export const Breached: Story = {
  args: {
    value: 455.2,
    ceiling: 500,
    caption: '91% of ceiling · 6 days left',
    action: <Button size="sm">Request refill</Button>,
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Breached` -- confirms the meter fill
// and the primary CTA both resolve to the light `--signal`.
export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: {
    value: 455.2,
    ceiling: 500,
    caption: '91% of ceiling · 6 days left',
    action: <Button size="sm">Request refill</Button>,
  },
};

export const NoActionOrCaption: Story = {
  args: {
    value: 60,
    ceiling: 100,
  },
};

// #273 — no usage-backend query client exists yet: an honest "Not wired" headline at the
// numeral's own visual weight, no meter, no fabricated $0.00.
export const Unwired: Story = {
  args: {
    status: 'unwired',
    caption: 'Budget figures arrive with the budget query wiring.',
  },
};

export const UnwiredLight: Story = {
  name: 'Unwired — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Unwired.args,
};

// #306 — a budget-balance/usage query in flight: skeleton geometry, no spinner.
export const Loading: Story = {
  args: { status: 'loading' },
};

// #306 — a budget-balance/usage query that failed. Distinct from `Unwired`: this account HAS a
// real budget, the query for it just failed — never rendered the same as "never wired."
export const ErrorState: Story = {
  args: {
    status: 'error',
    errorMessage: 'Failed to load budget consumption.',
    onRetry: () => {},
  },
};
