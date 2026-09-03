import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { panelFixtures } from '../dashboard-panels/fixtures';
import { renderPanelBody } from '../dashboard-panels/panel-renderers';
import { DashboardPanel } from '../dashboard-panel';
import { DashboardGrid } from './component';

/**
 * The layout a declarative dashboard page lays its panels out in (converse-frontends#446,
 * decision D-D): one column below `lg`, two at `lg` and up, and a `span: 2` panel across both.
 *
 * It replaces `/admin/overview`'s single `flex flex-col gap-8` column, where eight full-width
 * boards meant a page of scrolling for what fits in half the height side by side. C4 does that
 * migration; this story is what it is migrating ONTO.
 */
const meta: Meta<typeof DashboardGrid> = {
  title: 'Dashboard/DashboardGrid',
  component: DashboardGrid,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof DashboardGrid>;

function Board() {
  return (
    <DashboardGrid>
      {/* `stat` bodies panel themselves — `chrome="bare"`, per the console-ui skill's own
          exemption; see `DashboardPanelProps.chrome`. */}
      <DashboardPanel id="cost" title="Total cost" chrome="bare">
        {({ size }) => renderPanelBody(panelFixtures.stat, size)}
      </DashboardPanel>
      <DashboardPanel id="actors" title="Active actors" chrome="bare">
        {({ size }) => renderPanelBody(panelFixtures.stat, size)}
      </DashboardPanel>
      <DashboardPanel id="series" title="Cost per period by model" span={2}>
        {({ size }) => renderPanelBody(panelFixtures.series, size)}
      </DashboardPanel>
      <DashboardPanel id="ranked" title="Top models by cost">
        {({ size }) => renderPanelBody(panelFixtures.ranked, size)}
      </DashboardPanel>
      <DashboardPanel id="donut" title="Model distribution" subtitle="Values on hover">
        {({ size }) => renderPanelBody(panelFixtures.donut, size)}
      </DashboardPanel>
      <DashboardPanel id="table" title="Actors" span={2}>
        {({ size }) => renderPanelBody(panelFixtures.table, size)}
      </DashboardPanel>
    </DashboardGrid>
  );
}

export const Default: Story = { render: () => <Board /> };

export const Light: Story = {
  name: 'wireframe (light)',
  render: () => <Board />,
  globals: { theme: 'wireframe' },
};

/** Below `lg` every panel is full width — `span: 2` has nothing extra to say there. */
export const Mobile: Story = {
  name: 'Base — 390 (one column)',
  render: () => <Board />,
  globals: { viewport: { value: 'base390' } },
};

export const Tablet: Story = {
  name: 'md — 900 (still one column)',
  render: () => <Board />,
  globals: { viewport: { value: 'md900' } },
};
