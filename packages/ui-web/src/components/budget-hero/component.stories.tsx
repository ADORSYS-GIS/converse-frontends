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

export const NoActionOrCaption: Story = {
  args: {
    value: 60,
    ceiling: 100,
  },
};
