import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../rail-panel';
import { NavSpine } from './component';
import type { NavSpineItem } from './types';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

const baseItems: NavSpineItem[] = [
  { key: 'overview', label: 'Overview', icon: <Glyph />, active: true },
  { key: 'api-keys', label: 'Api-Keys', icon: <Glyph /> },
  { key: 'manage', label: 'Manage', icon: <Glyph /> },
];

const adminItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin', icon: <Glyph /> }];

const meta: Meta<typeof NavSpine> = {
  title: 'Shell/NavSpine',
  component: NavSpine,
  decorators: [
    (Story) => (
      <div className="w-52">
        <RailPanel>
          <Story />
        </RailPanel>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NavSpine>;

export const MemberWithoutAdmin: Story = {
  args: { items: baseItems, showAdmin: false, adminItems },
};

export const AdminWithGroup: Story = {
  args: { items: baseItems, showAdmin: true, adminItems },
};

export const AsLinks: Story = {
  args: {
    items: baseItems.map((item) => ({ ...item, href: `/${item.key}`, onSelect: undefined })),
    showAdmin: true,
    adminItems: adminItems.map((item) => ({ ...item, href: `/${item.key}` })),
  },
};
