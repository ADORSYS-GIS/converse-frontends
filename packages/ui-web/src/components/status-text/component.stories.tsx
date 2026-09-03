import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusText } from './component';

const meta: Meta<typeof StatusText> = {
  title: 'Primitives/Data/StatusText',
  component: StatusText,
  args: { children: 'active' },
};

export default meta;
type Story = StoryObj<typeof StatusText>;

export const Active: Story = { args: { tone: 'active', children: 'active' } };
export const Revoked: Story = { args: { tone: 'muted', children: 'revoked' } };
export const Archived: Story = { args: { tone: 'muted', children: 'archived' } };
export const Expiring: Story = { args: { tone: 'attention', children: 'expiring' } };
export const NearCeiling: Story = { args: { tone: 'attention', children: 'near ceiling' } };

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusText tone="active">active</StatusText>
      <StatusText tone="muted">revoked</StatusText>
      <StatusText tone="muted">archived</StatusText>
      <StatusText tone="attention">expiring</StatusText>
    </div>
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `AllTones` -- `active` (`--body`) and
// `attention` (`--signal`) must clear AA against the white panel; `muted` (`--muted`) is the
// sanctioned non-load-bearing exception in both themes.
export const AllTonesLight: Story = {
  name: 'All Tones — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusText tone="active">active</StatusText>
      <StatusText tone="muted">revoked</StatusText>
      <StatusText tone="muted">archived</StatusText>
      <StatusText tone="attention">expiring</StatusText>
    </div>
  ),
};
