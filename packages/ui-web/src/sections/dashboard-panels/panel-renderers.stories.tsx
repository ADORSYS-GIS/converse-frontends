import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { MultiSeriesSpendScale } from '../../components/multi-series-spend-chart';
import { DashboardGrid } from '../dashboard-grid';
import { DashboardPanel } from '../dashboard-panel';
import {
  dominatedStackedSeriesFixture,
  emptyPanelFixtures,
  panelFixtures,
  stackedSeriesFixture,
} from './fixtures';
import { renderPanelActions, renderPanelBody } from './panel-renderers';
import { panelChrome } from './types';
import type { DashboardPanelType, DashboardPanelView } from './types';

/**
 * One story per panel type (converse-frontends#446's Storybook AC), each rendering the REAL
 * registry entry inside a real `DashboardPanel` against a fixture — not a hand-drawn mock of what
 * the panel might look like. That is the point of the registry living in `packages/ui-web`: the
 * thing under review here is the same function `apps/console`'s `dashboard-renderer.tsx` calls.
 *
 * Each story is shown at the panel's own grid width, which is roughly half of what these charts
 * used to get in `/admin/overview`'s single column — reviewing them any wider would review a
 * layout the page never renders.
 */
const meta: Meta = {
  title: 'Dashboard/PanelRenderers',
  parameters: { layout: 'padded' },
};

export default meta;

/** One panel, at grid width, driving the real registry. `series`/`latency-series` hold their own
 *  scale so the toggle in the panel's actions slot is live rather than a static picture of one. */
function PanelStory({ type, view }: { type: DashboardPanelType; view: DashboardPanelView }) {
  const [scale, setScale] = useState<MultiSeriesSpendScale>('linear');
  const live: DashboardPanelView =
    view.kind === 'series' || view.kind === 'latency-series'
      ? { ...view, scale, onScaleChange: setScale }
      : view;

  return (
    <DashboardGrid>
      <DashboardPanel
        id={type}
        title={TITLES[type]}
        subtitle={SUBTITLES[type]}
        span={SPANS[type]}
        chrome={panelChrome(type)}
        actions={renderPanelActions(live, 'panel')}>
        {({ size }) => renderPanelBody(live, size)}
      </DashboardPanel>
    </DashboardGrid>
  );
}

const TITLES: Record<DashboardPanelType, string> = {
  stat: 'Total cost',
  'stat-group': 'Accounts by plan',
  series: 'Cost per period by model',
  ranked: 'Top models by cost',
  share: 'Which models',
  donut: 'Model distribution',
  table: 'Actors',
  'latency-cards': 'Latency by model',
  'latency-series': 'Chat latency over time',
};

const SUBTITLES: Record<DashboardPanelType, string | undefined> = {
  stat: 'All accounts with usage this period',
  'stat-group': 'Accounts with usage, per billing plan',
  series: undefined,
  ranked: 'Only models with usage in this window appear',
  share: 'Cost share across the window',
  donut: 'Requests by model — values on hover',
  table: 'Cost, requests and tokens per actor',
  'latency-cards': 'p99 hidden below 100 samples',
  'latency-series': 'Per-bucket percentiles, not a whole-window aggregate',
};

const SPANS: Record<DashboardPanelType, 1 | 2> = {
  stat: 1,
  'stat-group': 2,
  series: 2,
  ranked: 1,
  share: 1,
  donut: 1,
  table: 2,
  'latency-cards': 2,
  'latency-series': 2,
};

function storiesFor(type: DashboardPanelType) {
  const Default: StoryObj = { render: () => <PanelStory type={type} view={panelFixtures[type]} /> };
  const Empty: StoryObj = {
    name: 'Empty',
    render: () => <PanelStory type={type} view={emptyPanelFixtures[type]} />,
  };
  const Light: StoryObj = {
    name: 'Default — wireframe (light)',
    render: Default.render,
    globals: { theme: 'wireframe' },
  };
  return { Default, Empty, Light };
}

export const Stat = storiesFor('stat').Default;
export const StatEmpty = storiesFor('stat').Empty;
export const StatLight = storiesFor('stat').Light;

export const StatGroup = storiesFor('stat-group').Default;
export const StatGroupEmpty = storiesFor('stat-group').Empty;
export const StatGroupLight = storiesFor('stat-group').Light;

export const Series = storiesFor('series').Default;
export const SeriesEmpty = storiesFor('series').Empty;
export const SeriesLight = storiesFor('series').Light;

export const Ranked = storiesFor('ranked').Default;
export const RankedEmpty = storiesFor('ranked').Empty;
export const RankedLight = storiesFor('ranked').Light;

export const Share = storiesFor('share').Default;
export const ShareEmpty = storiesFor('share').Empty;
export const ShareLight = storiesFor('share').Light;

export const Donut = storiesFor('donut').Default;
export const DonutEmpty = storiesFor('donut').Empty;
export const DonutLight = storiesFor('donut').Light;

export const Table = storiesFor('table').Default;
export const TableEmpty = storiesFor('table').Empty;
export const TableLight = storiesFor('table').Light;

export const LatencyCards = storiesFor('latency-cards').Default;
export const LatencyCardsEmpty = storiesFor('latency-cards').Empty;
export const LatencyCardsLight = storiesFor('latency-cards').Light;

export const LatencySeries = storiesFor('latency-series').Default;
export const LatencySeriesEmpty = storiesFor('latency-series').Empty;
export const LatencySeriesLight = storiesFor('latency-series').Light;

// ── series · stacked bars (owner ruling 2026-09-03) ──────────────────────────────────────────
// The SAME `series` panel, drawn as a stack rather than as superposed lines — `options.style` in
// YAML, `view.style` here. Reviewed as its own set of stories because it is the one mark ADR
// 0013/0015 D5's ban was lifted for, and because the case that motivated the ban (one model at
// ~99% of the period) has to be visible beside the case that motivated the exception.

/** Daily spend × model, eight models with the tail folded into one summed `Other (3)` segment. */
export const SeriesStacked: StoryObj = {
  name: 'Series — stacked bars',
  render: () => <PanelStory type="series" view={stackedSeriesFixture} />,
};

export const SeriesStackedLight: StoryObj = {
  name: 'Series — stacked bars, wireframe (light)',
  render: SeriesStacked.render,
  globals: { theme: 'wireframe' },
};

/** Top-1 at ~99%: every other segment is a sliver, and the board states the caveat above itself
 *  rather than letting the picture imply a split that is not readable. */
export const SeriesStackedDominated: StoryObj = {
  name: 'Series — stacked bars, one model dominant',
  render: () => <PanelStory type="series" view={dominatedStackedSeriesFixture} />,
};

export const SeriesStackedDominatedLight: StoryObj = {
  name: 'Series — stacked bars, one model dominant, wireframe (light)',
  render: SeriesStackedDominated.render,
  globals: { theme: 'wireframe' },
};
