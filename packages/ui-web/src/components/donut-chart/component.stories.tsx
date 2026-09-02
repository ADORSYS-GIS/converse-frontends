import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { formatUsd } from '../../lib/money';
import { DonutChart } from './component';
import type { DonutSegment } from './types';

/**
 * The RING (owner ruling 2026-09-02, amending ADR 0013 D5: "pie charts allowed as RINGS (hollow
 * donut), never filled disks"). It returns BESIDE `ShareBar`, which keeps the single part-to-whole
 * job it was given on 2026-08-29 — not instead of it.
 *
 * These stories are the review surface for the three things that make this ring different from
 * the donut deleted in August: the hole is structural (so a total can live in it), values are on
 * hover only (no legend list), and the tail collapses into one `Other (N)` wedge.
 */
const meta: Meta<typeof DonutChart> = {
  title: 'Charts/DonutChart',
  component: DonutChart,
};

export default meta;
type Story = StoryObj<typeof DonutChart>;

const segment = (key: string, value: number, breached = false): DonutSegment => ({
  key,
  label: key,
  value,
  formattedValue: formatUsd(value),
  breached,
});

const modelMix: DonutSegment[] = [
  segment('gpt-4o', 812.4),
  segment('claude-sonnet-4', 96.15),
  segment('gpt-4o-mini', 21.8),
  segment('mistral-large', 9.05),
  segment('text-embedding-3', 2.4),
  segment('llama-3.1-70b', 1.1),
  segment('gemini-1.5-pro', 0.62),
  segment('deepseek-v3', 0.08),
];

export const Default: Story = {
  args: {
    segments: modelMix,
    width: 320,
    height: 260,
    centreMetric: formatUsd(modelMix.reduce((sum, s) => sum + s.value, 0)),
    centreLabel: 'TOTAL',
  },
};

/**
 * The shape the 726k-row phase-4 measurement found to be COMMON, not exceptional: one model at
 * ~86% and a long tail of slivers. As a filled disk this is unreadable; as a ring with an
 * `Other (N)` collapse and a real total in the hole, it still says something.
 */
export const TopOneDominant: Story = {
  name: 'Top-1 dominant (the common prod shape)',
  args: { ...Default.args, topN: 4 },
};

/** Selection is the ONLY thing that turns a wedge orange — never decoration, and never more than
 *  one wedge, which the component enforces itself rather than trusting the data. */
export const Selected: Story = {
  render: function SelectedStory(args) {
    const [selectedKey, setSelectedKey] = useState<string | null>('claude-sonnet-4');
    return <DonutChart {...args} selectedKey={selectedKey} onSelectSegment={setSelectedKey} />;
  },
  args: Default.args,
};

/** Two breached segments in the data, one accent wedge on screen. */
export const SingleAccentUnderMultipleBreaches: Story = {
  name: 'One accent, even with several breaches',
  args: {
    ...Default.args,
    segments: [
      segment('gpt-4o', 812.4, true),
      segment('claude-sonnet-4', 96.15, true),
      segment('gpt-4o-mini', 21.8),
    ],
  },
};

/** Nothing to plot is still a ring, at the gridline tone — never a collapsed, zero-height gap. */
export const Empty: Story = {
  args: { segments: [], width: 320, height: 260, emptyMessage: 'No spend in this range.' },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  args: Default.args,
  globals: { theme: 'wireframe' },
};

export const TopOneDominantLight: Story = {
  name: 'Top-1 dominant — wireframe (light)',
  args: TopOneDominant.args,
  globals: { theme: 'wireframe' },
};
