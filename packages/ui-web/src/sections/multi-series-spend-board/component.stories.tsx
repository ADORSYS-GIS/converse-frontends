import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { MultiSeriesSpendScale, MultiSeriesSpendSeries } from '../../components/multi-series-spend-chart';
import { MultiSeriesSpendBoard } from './component';

function days(count: number, base = '2026-02-01') {
  const start = new Date(base);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * 86_400_000));
}

function denseSeries(key: string, label: string, values: number[]): MultiSeriesSpendSeries {
  const d = days(values.length);
  return { key, label, points: values.map((y, i) => ({ x: d[i], y })) };
}

function sparseSeries(
  key: string,
  label: string,
  dayCount: number,
  active: [number, number][]
): MultiSeriesSpendSeries {
  const d = days(dayCount);
  return { key, label, points: active.map(([i, y]) => ({ x: d[i], y })) };
}

// Same real fixture shape `MultiSeriesSpendChart`'s own stories use — one dominant model beside
// several sub-1%-share ones (ADR 0013 D5's measured production shape).
const MODEL_SERIES: MultiSeriesSpendSeries[] = [
  denseSeries('deepseek-v4-flash-0731', 'deepseek-v4-flash-0731', [
    0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.1, 0.115, 0.12, 0.1, 0.095, 0.09, 0.085, 0.145,
  ]),
  sparseSeries('adorsys-researcher', 'adorsys-researcher', 14, [
    [2, 0.002],
    [7, 0.0015],
    [11, 0.002],
  ]),
  sparseSeries('adorsys-coder', 'adorsys-coder', 14, [
    [4, 0.0001],
    [9, 0.00016],
  ]),
];

const dayTick = (d: Date) => `${String(d.getDate()).padStart(2, '0')} Feb`;

const meta: Meta<typeof MultiSeriesSpendBoard> = {
  title: 'Sections/MultiSeriesSpendBoard',
  component: MultiSeriesSpendBoard,
  parameters: { layout: 'fullscreen' },
  args: {
    label: 'Spend by model',
    series: MODEL_SERIES,
    scale: 'log',
    fallbackWidth: 872,
    height: 220,
    formatXTick: dayTick,
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MultiSeriesSpendBoard>;

/**
 * Interactive — the scale toggle actually drives the chart, same as the real `OverviewCentre`/
 * `UsageOverviewCentre` wiring (a URL-first `apps/console` hook owns `scale` there instead of
 * this local `useState`).
 */
function InteractiveBoard(args: React.ComponentProps<typeof MultiSeriesSpendBoard>) {
  const [scale, setScale] = useState<MultiSeriesSpendScale>(args.scale);
  return <MultiSeriesSpendBoard {...args} scale={scale} onScaleChange={setScale} />;
}

export const Populated: Story = {
  render: (args) => <InteractiveBoard {...args} onScaleChange={() => {}} />,
};

export const Linear: Story = {
  name: 'Default scale — linear (Spend by account, estate)',
  args: { label: 'Spend by account', scale: 'linear' },
  render: (args) => <InteractiveBoard {...args} onScaleChange={() => {}} />,
};

export const Loading: Story = { args: { status: 'loading' } };

export const ErrorState: Story = {
  name: 'Error',
  args: { status: 'error', errorMessage: 'Failed to load spend by model.' },
};

export const Truncated: Story = {
  name: 'Truncated fan-out — caption states the cap',
  args: { truncationCaption: 'Showing the top 25 of 61 accounts.' },
};

export const Empty: Story = { args: { series: [] } };
