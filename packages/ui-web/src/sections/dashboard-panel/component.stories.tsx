import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { panelFixtures } from '../dashboard-panels/fixtures';
import { renderPanelBody } from '../dashboard-panels/panel-renderers';
import { DashboardGrid } from '../dashboard-grid';
import { DashboardPanel } from './component';

/**
 * The board wrapper every declarative dashboard panel renders through (converse-frontends#446,
 * decision D-E): `Card` + `ZoneHeading` + a body render-prop + the zoom affordance that makes a
 * two-column grid workable — a two-up chart is half the width the same chart had in the old
 * single-column `/admin/overview`.
 *
 * The three states the AC asks to see: at rest, focused (the ring that scopes the `v` hotkey), and
 * expanded (the Base UI dialog at ~1280 x 80vh, drawing the SAME body at `size: 'expanded'`).
 */
const meta: Meta<typeof DashboardPanel> = {
  title: 'Sections/DashboardPanel',
  component: DashboardPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof DashboardPanel>;

const body = ({ size }: { size: 'panel' | 'expanded' }) =>
  renderPanelBody(panelFixtures.ranked, size);

export const Default: Story = {
  render: () => (
    <DashboardGrid>
      <DashboardPanel id="top-models" title="Top models by cost" subtitle="This month · UTC">
        {body}
      </DashboardPanel>
    </DashboardGrid>
  ),
};

/**
 * The focus ring, which is not decoration: it is what tells a keyboard user that `v` will expand
 * THIS panel. A panel nobody can focus is a panel nobody can zoom from the keyboard.
 */
export const Focused: Story = {
  render: function FocusedStory() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      ref.current?.querySelector<HTMLElement>('.dashboard-panel')?.focus();
    }, []);
    return (
      <div ref={ref}>
        <DashboardGrid>
          <DashboardPanel
            id="top-models"
            title="Top models by cost"
            subtitle="Focused — press v to expand">
            {body}
          </DashboardPanel>
        </DashboardGrid>
      </div>
    );
  },
};

/** The zoom dialog, open. The body is the same render-prop, called with `size: 'expanded'` — a
 *  taller chart and a longer list, never a scaled-up screenshot of the panel. */
export const Expanded: Story = {
  render: () => (
    <DashboardGrid>
      <DashboardPanel
        id="top-models"
        title="Top models by cost"
        subtitle="This month · UTC"
        expanded>
        {body}
      </DashboardPanel>
    </DashboardGrid>
  ),
};

/** A `span: 2` panel beside two single-column ones — the layout `DashboardGrid` exists for. */
export const SpanTwo: Story = {
  name: 'span: 2',
  render: () => (
    <DashboardGrid>
      <DashboardPanel id="series" title="Cost per period by model" span={2}>
        {({ size }) => renderPanelBody(panelFixtures.series, size)}
      </DashboardPanel>
      <DashboardPanel id="ranked" title="Top models by cost">
        {body}
      </DashboardPanel>
      <DashboardPanel id="donut" title="Model distribution" subtitle="Values on hover">
        {({ size }) => renderPanelBody(panelFixtures.donut, size)}
      </DashboardPanel>
    </DashboardGrid>
  ),
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  render: Default.render,
  globals: { theme: 'wireframe' },
};

export const ExpandedLight: Story = {
  name: 'Expanded — wireframe (light)',
  render: Expanded.render,
  globals: { theme: 'wireframe' },
};

/** The one-column tier — every panel is full width below `lg`, `span: 2` included. */
export const Mobile: Story = {
  name: 'Base — 390 (one column)',
  render: SpanTwo.render,
  globals: { viewport: { value: 'base390' } },
};
