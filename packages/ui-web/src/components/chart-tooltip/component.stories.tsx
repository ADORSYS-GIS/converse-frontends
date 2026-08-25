import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { ChartTooltip } from './component';
import type { ChartTooltipRow } from './types';

/**
 * `ChartTooltip` positions itself off a real `<svg>` `contextElement` (Floating
 * UI's virtual-element requirement), so every story renders a tiny stand-in chart
 * and drives the tooltip's `anchorElement`/`x`/`y` off it -- there is no longer a
 * `containerWidth`/`width` prop to fake positioning without one.
 */
function ChartTooltipHarness({
  x,
  y,
  title,
  rows,
  visible = true,
}: {
  x: number;
  y: number;
  title?: string;
  rows: ChartTooltipRow[];
  visible?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    setAnchorElement(svgRef.current);
  }, []);

  return (
    <div style={{ width: 320, height: 200, position: 'relative' }}>
      <svg ref={svgRef} width={320} height={200}>
        <circle cx={x} cy={y} r={4} fill={SPEC_GREY_RAMP[0]} />
      </svg>
      <ChartTooltip
        visible={visible}
        anchorElement={anchorElement}
        x={x}
        y={y}
        title={title}
        rows={rows}
      />
    </div>
  );
}

const meta: Meta<typeof ChartTooltipHarness> = {
  title: 'Charts/ChartTooltip',
  component: ChartTooltipHarness,
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartTooltipHarness>;

export const SingleRow: Story = {
  args: {
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10', color: SPEC_GREY_RAMP[0] }],
  },
};

export const MultiSeries: Story = {
  args: {
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [
      { key: 'project-a', label: 'project-a', value: '$212.40', color: SPEC_GREY_RAMP[0] },
      { key: 'project-b', label: 'project-b (over budget)', value: '$612.90', color: SPEC_ACCENT },
      { key: 'project-c', label: 'project-c', value: '$88.00', color: SPEC_GREY_RAMP[2] },
    ],
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MultiSeries` -- the tooltip card is
// `--panel` (white) not `--floor`, and the accent row must still read as `--signal`.
export const MultiSeriesLight: Story = {
  name: 'Multi Series — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: {
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [
      { key: 'project-a', label: 'project-a', value: '$212.40', color: SPEC_GREY_RAMP[0] },
      { key: 'project-b', label: 'project-b (over budget)', value: '$612.90', color: SPEC_ACCENT },
      { key: 'project-c', label: 'project-c', value: '$88.00', color: SPEC_GREY_RAMP[2] },
    ],
  },
};

/** Near the chart's left edge -- `shift` middleware keeps the card inside the viewport instead of clipping. */
export const NearEdge: Story = {
  args: {
    x: 8,
    y: 24,
    rows: [{ key: 'spend', label: 'Spend', value: '$12.00', color: SPEC_GREY_RAMP[0] }],
  },
};

/** Near the top of the chart -- `flip` middleware places the card below the anchor instead of clipping above. */
export const FlipsBelowNearTop: Story = {
  args: {
    x: 160,
    y: 4,
    title: 'Aug 21',
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10', color: SPEC_GREY_RAMP[0] }],
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
    x: 160,
    y: 120,
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10' }],
  },
};
