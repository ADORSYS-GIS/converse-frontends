import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from './component';

// `RailPanel` renders no background of its own (owner revision 2026-08-25 — it is a rail
// *section*, not a self-panelled card); the story decorator supplies the `bg-surface` rail
// column it is meant to live inside, purely so a single section is legible in isolation here.
const meta: Meta<typeof RailPanel> = {
  title: 'Shell/RailPanel',
  component: RailPanel,
  decorators: [
    (Story) => (
      <div className="w-52 bg-surface">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RailPanel>;

export const Default: Story = {
  args: {
    label: 'SCOPE',
    children: (
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[10px] text-subtle">Account</div>
          <div className="font-mono text-xs text-ink">adorsys-gis</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-subtle">Project</div>
          <div className="font-mono text-xs text-ink">all projects</div>
        </div>
      </div>
    ),
  },
};

export const NoLabel: Story = {
  args: {
    children: <div className="font-mono text-xs text-soft">Unlabelled panel content.</div>,
  },
};

// The rail *column* — not RailPanel — owns the surface fill and the hairline separators
// between stacked sections (owner revision 2026-08-25, console-ui skill "Rails are flush,
// aligned, full-height columns"): `bg-surface divide-y divide-raised` on the column, sections
// as direct children. This is how `ConsoleShell`'s left/right rails compose multiple sections.
export const Stacked: Story = {
  render: () => (
    <div className="flex w-52 flex-col divide-y divide-raised bg-surface">
      <RailPanel label="SCOPE">
        <div className="font-mono text-xs text-ink">adorsys-gis</div>
      </RailPanel>
      <RailPanel label="FILTERS">
        <div className="font-mono text-xs text-ink">All projects</div>
      </RailPanel>
    </div>
  ),
};
