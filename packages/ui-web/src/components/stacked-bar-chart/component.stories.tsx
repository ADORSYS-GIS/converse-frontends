import type { Meta, StoryObj } from '@storybook/react-vite';

import { StackedBarChart } from './component';
import type { StackedBarSeries } from './types';

/**
 * Daily spend × model as a stack — the one mark ADR 0013/0015 D5's stacked-bar ban is lifted for
 * (owner ruling 2026-09-03).
 *
 * Both cases are here on purpose. `Default` is the case the exception was granted for: several
 * models with readable shares, where the bar's HEIGHT answers "what did we spend that day" and
 * the segments answer "on what". `TopOneDominant` is the case the ban was measured on — one model
 * at ~99% — and the board states that in words above itself rather than letting the picture imply
 * a split nobody can read.
 */
const meta: Meta<typeof StackedBarChart> = {
  title: 'Charts/StackedBarChart',
  component: StackedBarChart,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof StackedBarChart>;

const DAY = 86_400_000;
const START = Date.UTC(2026, 7, 3);

function days(count: number, shape: (index: number) => number) {
  return Array.from({ length: count }, (_, index) => ({
    x: new Date(START + index * DAY),
    y: shape(index),
  }));
}

const MODELS: [string, number][] = [
  ['gpt-4o', 312.4],
  ['claude-sonnet-4', 196.15],
  ['gpt-4o-mini', 88.8],
  ['mistral-large', 41.05],
  ['text-embedding-3', 18.4],
  ['llama-3.1-70b', 9.1],
  ['gemini-1.5-pro', 4.62],
];

const readable: StackedBarSeries[] = MODELS.map(([key, total], rank) => ({
  key,
  label: key,
  points: days(21, (index) => (total / 21) * (0.7 + 0.4 * Math.sin(index / 2 + rank))),
}));

const dominated: StackedBarSeries[] = [
  { key: 'gpt-4o', label: 'gpt-4o', points: days(21, (i) => 40 * (0.8 + 0.3 * Math.sin(i / 3))) },
  { key: 'claude-sonnet-4', label: 'claude-sonnet-4', points: days(21, () => 0.35) },
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', points: days(21, () => 0.12) },
];

export const Default: Story = {
  args: { series: readable, width: 900, height: 300, topN: 5 },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** The 95%-top-1 caveat, in the state that triggers it. */
export const TopOneDominant: Story = {
  name: 'One model dominant (the D5 caveat)',
  args: { series: dominated, width: 900, height: 300, topN: 5 },
};

export const TopOneDominantLight: Story = {
  name: 'One model dominant — wireframe (light)',
  args: TopOneDominant.args,
  globals: { theme: 'wireframe' },
};

/** A count board: the axis must not fabricate a `$`. */
export const CountAxis: Story = {
  args: {
    series: readable.slice(0, 4).map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p, y: Math.round(p.y * 12) })),
    })),
    width: 900,
    height: 300,
    formatValue: (value: number) => `${value.toLocaleString('en-US')} requests`,
    formatYTick: (value: number) => value.toLocaleString('en-US'),
  },
};

export const Empty: Story = {
  args: { series: [], width: 900, height: 300 },
};

export const Mobile: Story = {
  name: 'Base — 390 (one column)',
  args: { series: readable, width: 340, height: 240, topN: 4 },
  globals: { viewport: { value: 'base390' } },
};
