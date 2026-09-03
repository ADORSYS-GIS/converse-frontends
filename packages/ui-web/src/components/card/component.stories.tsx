import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { Card } from './component';

const meta: Meta<typeof Card> = {
  title: 'Data display/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: 'Usage this month',
    children: <p className="text-soft font-sans text-[13px]">$1,204.50 across 3 projects.</p>,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Api-Keys',
    actions: (
      <Button type="button" variant="ghost" size="sm">
        Export
      </Button>
    ),
    children: <p className="text-soft font-sans text-[13px]">14 active keys.</p>,
  },
};

export const NoHead: Story = {
  name: 'No title or actions',
  args: {
    children: <p className="text-soft font-sans text-[13px]">A card with body content only.</p>,
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  args: Default.args,
  globals: { theme: 'wireframe' },
};
