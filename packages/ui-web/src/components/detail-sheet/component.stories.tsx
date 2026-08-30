import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '../button';
import { DetailSheet } from './component';

const meta: Meta<typeof DetailSheet> = {
  title: 'Forms & actions/DetailSheet',
  component: DetailSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: 'sk_live_49f3a2',
    subtitle: 'Created 2026-08-30 · gateway-prod',
    children: (
      <p className="font-sans text-[13px] leading-[1.5] text-soft">
        The record's full detail renders here — fields, history, whatever the caller composes.
      </p>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof DetailSheet>;

export const Default: Story = {};

export const WithFooter: Story = {
  args: {
    footer: (
      <Button type="button" variant="primary">
        Revoke key
      </Button>
    ),
  },
};

export const Closed: Story = { args: { open: false } };

// ADR 0010 phase 4: the `wireframe` (light) counterpart — the dialog portals to `document.body`,
// outside the canvas root the preview decorator wraps, so this confirms the panel tokens
// re-resolve there too (see `AccountNameDialog`'s matching story for the same check).
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};
