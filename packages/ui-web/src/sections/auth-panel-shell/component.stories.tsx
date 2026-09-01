import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuthPanelShell } from './component';
import { authPanelShellDeviceEntryLead, authPanelShellDeviceEntryTitle } from './fixtures';

const meta: Meta<typeof AuthPanelShell> = {
  title: 'Sections/AuthPanelShell',
  component: AuthPanelShell,
  parameters: { layout: 'fullscreen' },
  args: {
    title: authPanelShellDeviceEntryTitle,
    lead: authPanelShellDeviceEntryLead,
  },
};

export default meta;
type Story = StoryObj<typeof AuthPanelShell>;

export const Default: Story = {
  render: (args) => (
    <AuthPanelShell {...args}>
      <div className="text-soft font-sans text-[13px]">Panel body goes here.</div>
    </AuthPanelShell>
  ),
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: (args) => (
    <AuthPanelShell {...args}>
      <div className="text-soft font-sans text-[13px]">Panel body goes here.</div>
    </AuthPanelShell>
  ),
};

export const MobileBaseTier: Story = {
  name: 'Default — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: (args) => (
    <AuthPanelShell {...args}>
      <div className="text-soft font-sans text-[13px]">Panel body goes here.</div>
    </AuthPanelShell>
  ),
};
