import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ShareBar } from './component';
import type { ShareBarSegment } from './types';

const segments: ShareBarSegment[] = [
  { key: 'atlas', label: 'atlas-prod', value: 61.2, formattedValue: '$61.20' },
  { key: 'ledger', label: 'ledger-api', value: 38.05, formattedValue: '$38.05' },
  { key: 'sandbox', label: 'sandbox', value: 27.4, formattedValue: '$27.40' },
  { key: 'internal', label: 'internal-tools', value: 15.9, formattedValue: '$15.90' },
];

const meta: Meta<typeof ShareBar> = {
  title: 'Components/ShareBar',
  component: ShareBar,
  parameters: { layout: 'padded' },
  args: { segments },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <div className="max-w-[520px]">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ShareBar>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Selected: Story = {
  args: { selectedKey: 'ledger' },
};

/** One series over its ceiling — the single sanctioned use of the accent in a chart. */
export const Breached: Story = {
  args: {
    segments: segments.map((segment, index) =>
      index === 2 ? { ...segment, breached: true } : segment
    ),
  },
};

/**
 * The long-tail case a donut cannot draw: 99 / 1 / 0.007. Every segment stays visible thanks to
 * `MIN_VISIBLE_PERCENT`, and the sub-1% shares read as `<1%` rather than a misleading `0%`.
 */
export const LongTail: Story = {
  args: {
    segments: [
      { key: 'unassigned', label: 'unassigned', value: 1.35, formattedValue: '$1.35' },
      { key: 'wcd6', label: 'wcd6epjstskvhdrmofmbu4r7', value: 0.015, formattedValue: '$0.015' },
      { key: 'wwl1', label: 'wwl1mftbqy2x7jqqek5s9s', value: 0.0001, formattedValue: '$0.0001' },
    ],
  },
};

/** Read-only: no `onSelectSegment`, so no row is a live control. */
export const ReadOnly: Story = {
  args: { onSelectSegment: undefined },
};

/** Nothing spent in the period — the track renders `raised` and every share is 0%. */
export const Zero: Story = {
  args: {
    segments: segments.map((segment) => ({ ...segment, value: 0, formattedValue: '$0.00' })),
  },
};

/** Labels longer than the column truncate rather than wrapping the row to two lines. */
export const LongLabels: Story = {
  args: {
    segments: segments.map((segment) => ({
      ...segment,
      label: `${segment.label}-with-a-very-long-project-identifier-suffix`,
    })),
  },
};

export const Interactive: Story = {
  render: function Render(args) {
    // Storybook-only local state standing in for the page's `?series=` URL param.
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    return <ShareBar {...args} selectedKey={selectedKey} onSelectSegment={setSelectedKey} />;
  },
};
