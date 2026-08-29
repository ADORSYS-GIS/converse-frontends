import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { formatMsAxis } from '../../lib/duration';
import { LatencyDashboard } from './component';
import { overviewLatencySeries, partiallyReportedLatencySeries, sparseLatencySeries } from './fixtures';

const meta: Meta<typeof LatencyDashboard> = {
  title: 'Sections/LatencyDashboard',
  component: LatencyDashboard,
  parameters: { layout: 'fullscreen' },
  args: {
    series: overviewLatencySeries,
    fallbackWidth: 528,
    height: 310,
    formatXTick: formatMsAxis,
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
type Story = StoryObj<typeof LatencyDashboard>;

export const Populated: Story = {};

export const Empty: Story = { args: { series: [] } };

// #272 — no usage-backend query client exists yet; distinct wording from `Empty` above.
export const Unwired: Story = { args: { series: [], status: 'unwired' } };

export const Loading: Story = { args: { status: 'loading' } };

export const ErrorState: Story = {
  args: { status: 'error', errorMessage: 'Failed to load latency data.', onRetry: () => {} },
};

export const MobileBaseTier: Story = { globals: { viewport: { value: 'base390' } } };

// The contract's real, wired state (lightbridge-authz `feat/usage-latency-percentiles`): every
// model reported real per-bucket p95 samples across the range, so the footnote naming a gap is
// absent — nothing to caveat.
export const RealPercentiles: Story = {
  args: {
    series: overviewLatencySeries,
    status: 'ready',
    formatXTick: formatMsAxis,
    footnote: 'p95 per bucket across the last 30 days.',
  },
};

// A short range or a low-traffic model produces only a handful of buckets per row — too few for
// a p99 to mean anything (`openapi/usage.backend.yaml`'s own `latency_p99_ms` doc comment: it
// "degenerates toward the bucket maximum" below ~100 samples), and barely enough to draw a shape
// at all. The footnote says so explicitly rather than letting a thin ridge read as a rendering
// bug.
export const SparseData: Story = {
  args: {
    series: sparseLatencySeries,
    status: 'ready',
    formatXTick: formatMsAxis,
    footnote: 'Only 2–4 buckets per model in this range — percentiles are noisy at this volume.',
  },
};

// Per-series honesty, the point of this whole feature: `signal-summary` is an aggregate metric
// signal (an OTLP summary/histogram data point), which the usage backend deliberately never
// attaches a per-request latency to — so its row renders with no shape and "no latency reported"
// rather than either fabricating one or dropping the row (and the reader silently losing track of
// it) or blanking the whole chart over one model's gap.
export const PartiallyReported: Story = {
  args: {
    series: partiallyReportedLatencySeries,
    status: 'ready',
    formatXTick: formatMsAxis,
    footnote: 'No latency reported for signal-summary — it only emits aggregate metric signals.',
  },
};
