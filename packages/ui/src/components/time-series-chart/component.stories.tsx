import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { TimeSeriesChart } from './component';
import type { TimeSeriesSeries } from './types';

const meta: Meta<typeof TimeSeriesChart> = {
  title: 'UI/TimeSeriesChart',
  component: TimeSeriesChart,
  args: { width: 560, height: 280 },
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: '#000', padding: 24, width: 620 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TimeSeriesChart>;

function days(count: number, seed = 1) {
  const base = new Date('2026-08-01');
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000 * seed));
}

function makeSeries(
  key: string,
  label: string,
  values: number[],
  breached = false
): TimeSeriesSeries {
  const dates = days(values.length);
  return { key, label, breached, points: dates.map((x, i) => ({ x, y: values[i] })) };
}

const projectA = makeSeries('project-a', 'project-a', [120, 180, 90, 210, 260, 300, 280]);
const projectB = makeSeries('project-b', 'project-b', [40, 60, 55, 70, 90, 85, 120]);
const projectC = makeSeries('project-c', 'project-c', [400, 420, 610, 590, 700, 690, 745], true);

export const SpendOverTime: Story = {
  args: { series: [projectA, projectB, projectC] },
};

export const SingleSeries: Story = {
  args: { series: [projectA] },
};

export const BarsVariant: Story = {
  args: { series: [projectA, projectB], variant: 'bars' },
};

/** One data point per series -- must render a marker, not an invisible zero-length line. */
export const SingleDataPoint: Story = {
  args: {
    series: [makeSeries('project-a', 'project-a', [180])],
  },
};

/** Every value is 0 -- the domain must widen so the flat line still renders above the floor. */
export const AllZero: Story = {
  args: {
    series: [makeSeries('project-a', 'project-a', [0, 0, 0, 0, 0])],
  },
};

/** One series two orders of magnitude larger than the other -- the small one shouldn't vanish into the baseline unreadably, and the domain must still fit both. */
export const OneSeriesDwarfsAnother: Story = {
  args: {
    series: [
      makeSeries('tiny-project', 'tiny-project', [5, 8, 6, 9, 7]),
      makeSeries('huge-project', 'huge-project', [4000, 4200, 3900, 4500, 4800]),
    ],
  },
};

/** No data at all -- renders the axis frame, not a crash or a blank white hole. */
export const Empty: Story = {
  args: { series: [] },
};

export const WithBreachedSeries: Story = {
  args: { series: [projectA, projectC] },
};
