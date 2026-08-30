import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InspectorSettingsPanel } from './component';
import { inspectorSettingsAccount, inspectorSettingsUnnamedAccount } from './fixtures';

const meta: Meta<typeof InspectorSettingsPanel> = {
  title: 'Sections/InspectorSettingsPanel',
  component: InspectorSettingsPanel,
  parameters: { layout: 'fullscreen' },
  args: {
    account: inspectorSettingsAccount,
    loading: false,
    onRetry: () => {},
    onRename: () => {},
    onCopyId: () => {},
    onNewAccount: () => {},
    onNewProject: () => {},
    onRequestRefill: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-chrome max-w-[280px] p-5">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InspectorSettingsPanel>;

export const Populated: Story = {};

export const UnnamedAccount: Story = {
  args: { account: inspectorSettingsUnnamedAccount },
};

export const NoAccount: Story = {
  args: { account: null },
};

export const Loading: Story = {
  args: { account: null, loading: true },
};

export const ErrorState: Story = {
  args: { account: null, error: 'Could not load your account.' },
};
