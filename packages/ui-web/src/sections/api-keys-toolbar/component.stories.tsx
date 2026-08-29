import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ApiKeysToolbar } from './component';
import { API_KEY_PROJECT_OPTIONS, API_KEY_STATUS_OPTIONS } from './fixtures';

const meta: Meta<typeof ApiKeysToolbar> = {
  title: 'Sections/ApiKeysToolbar',
  component: ApiKeysToolbar,
  parameters: { layout: 'padded' },
  args: {
    projectField: {
      label: 'Project',
      value: 'gateway-prod',
      options: API_KEY_PROJECT_OPTIONS,
      onChange: () => {},
    },
    statusOptions: API_KEY_STATUS_OPTIONS,
    statusValue: 'all',
    onStatusChange: () => {},
    search: '',
    onSearchChange: () => {},
    onCreate: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ApiKeysToolbar>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Filtered: Story = {
  args: { statusValue: 'active', search: 'desktop' },
};

/**
 * The console's most common landing state: scope is "All projects", which no key can belong to,
 * so creation is unavailable. The reason is stated visibly, not just as a `title` — a disabled
 * primary action with no explanation is the screen's worst dead end.
 */
export const CannotCreate: Story = {
  args: { onCreate: undefined, createDisabledReason: 'Select a project to create a key.' },
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
    const [search, setSearch] = useState('');
    return (
      <ApiKeysToolbar
        {...args}
        statusValue={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
      />
    );
  },
};
