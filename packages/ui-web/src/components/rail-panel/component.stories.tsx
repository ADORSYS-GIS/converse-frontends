import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from './component';

const meta: Meta<typeof RailPanel> = {
  title: 'Shell/RailPanel',
  component: RailPanel,
  decorators: [
    (Story) => (
      <div className="w-52">
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

export const Stacked: Story = {
  render: () => (
    <div className="flex w-52 flex-col gap-2">
      <RailPanel label="SCOPE">
        <div className="font-mono text-xs text-ink">adorsys-gis</div>
      </RailPanel>
      <RailPanel label="FILTERS">
        <div className="font-mono text-xs text-ink">All projects</div>
      </RailPanel>
    </div>
  ),
};
