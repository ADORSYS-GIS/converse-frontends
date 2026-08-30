import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../card';
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
        <Card title="MANAGE">
          <Story />
        </Card>
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

const settingsTabs: SubNavItem[] = [
  { key: 'account', label: 'Account', active: true },
  { key: 'projects', label: 'Projects', count: 3 },
];

// Settings' Account/Projects tab row (Attio pattern) — text tabs in a line, active marked by a
// 2px underline rather than a rail's full-width fill. The meta's rail `Card` decorator is sized
// for the VERTICAL stories above, so this one replaces it with a plain full-width box.
export const Horizontal: Story = {
  decorators: [() => <SubNav items={settingsTabs} orientation="horizontal" />],
  args: { items: settingsTabs, orientation: 'horizontal' },
};
