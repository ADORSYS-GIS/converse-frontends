import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../rail-panel';
import { SubNav } from './component';
import type { SubNavItem } from './types';

const manageItems: SubNavItem[] = [
  { key: 'projects', label: 'Projects', count: 24, active: true },
  { key: 'accounts', label: 'Accounts', count: 3 },
  { key: 'budgets', label: 'Budgets', count: 24 },
  { key: 'members', label: 'Members', count: 17 },
];

const meta: Meta<typeof SubNav> = {
  title: 'Shell/SubNav',
  component: SubNav,
  decorators: [
    (Story) => (
      <div className="w-52">
        <RailPanel label="MANAGE">
          <Story />
        </RailPanel>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SubNav>;

export const ManageSections: Story = { args: { items: manageItems } };

export const WithoutCounts: Story = {
  args: {
    items: manageItems.map(({ count: _count, ...item }) => item),
  },
};
