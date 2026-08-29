import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Meter } from './component';

const meta: Meta<typeof Meter> = {
  title: 'Data display/Meter',
  component: Meter,
};

export default meta;
type Story = StoryObj<typeof Meter>;

export const UnderThreshold: Story = {
  args: { value: 142.55, ceiling: 500, label: 'Account ceiling' },
};

export const AtThreshold: Story = {
  render: () => <Meter value={455.2} ceiling={500} label="gateway-prod ceiling" />,
};

export const Breached: Story = {
  args: { value: 498.1, ceiling: 500, label: 'gateway-prod ceiling' },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Breached` -- the fill must resolve to
// the light `--signal` (`#B4441C`), not the dark hex.
export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { value: 498.1, ceiling: 500, label: 'gateway-prod ceiling' },
};

// Adaptive-precision USD in the paired caption: `$0.0063 of $12.00`, the real production figures.
// The track is a hair off empty here and that is honest — what must NOT happen is the caption
// agreeing with it by printing `$0.00`.
export const SubCentAgainstCeiling: Story = {
  name: 'Sub-cent against ceiling — $0.006338 of $12.00',
  args: { value: 0.006338, ceiling: 12, label: 'Account ceiling' },
};

export const NoCaption: Story = {
  args: { value: 60, ceiling: 100, showCaption: false, label: 'Consumption' },
};

export const CustomThreshold: Story = {
  args: { value: 60, ceiling: 100, threshold: 0.5, label: 'Consumption' },
};
