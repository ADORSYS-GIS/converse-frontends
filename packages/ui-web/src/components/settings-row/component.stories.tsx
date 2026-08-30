import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Card } from '../card';
import { Button } from '../button';
import { SettingsRow } from './component';

const meta: Meta<typeof SettingsRow> = {
  title: 'Data display/SettingsRow',
  component: SettingsRow,
  args: {
    label: 'Account name',
    value: 'Widgets Ltd',
  },
};

export default meta;
type Story = StoryObj<typeof SettingsRow>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: {
    label: 'Default quota tier',
    description: 'Applied to new projects that do not set their own tier.',
    value: 'growth',
  },
};

export const DataValue: Story = {
  name: 'Data value (mono, e.g. an id)',
  args: { label: 'Account id', value: 'acct_49534505', valueKind: 'data' },
};

export const MutedValue: Story = {
  name: 'Muted value — "Not set"',
  args: { label: 'Account name', value: 'Not set', valueMuted: true },
};

export const WithAction: Story = {
  args: {
    label: 'Account name',
    value: 'Widgets Ltd',
    action: (
      <Button type="button" variant="secondary" size="sm">
        Rename
      </Button>
    ),
  },
};

export const Clickable: Story = {
  name: 'Row as a click target (opens a DetailSheet)',
  args: {
    label: 'adorsys-gis/research',
    description: 'active · growth',
    onClick: fn(),
  },
};

/** The classical settings-list shape — a `Card` containing a stack of rows, parted by hairlines. */
export const List: Story = {
  render: () => (
    <Card>
      <div className="settings-list">
        <SettingsRow
          label="Account name"
          value="Widgets Ltd"
          action={
            <Button type="button" variant="secondary" size="sm">
              Rename
            </Button>
          }
        />
        <SettingsRow
          label="Account id"
          value="acct_49534505"
          valueKind="data"
          action={
            <Button type="button" variant="ghost" size="sm">
              Copy
            </Button>
          }
        />
        <SettingsRow label="Status" value="active" />
        <SettingsRow label="Default quota tier" value="growth" />
      </div>
    </Card>
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const ListLight: Story = {
  name: 'List — wireframe (light)',
  render: List.render,
  globals: { theme: 'wireframe' },
};
