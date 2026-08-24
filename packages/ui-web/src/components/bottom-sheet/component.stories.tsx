import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from './component';

const filterFields = (
  <div className="grid grid-cols-2 gap-3">
    {[
      ['Range', 'Last 30 days'],
      ['Bucket', 'Daily'],
      ['Group by', 'Project × Model'],
      ['Model', 'All models'],
    ].map(([label, value]) => (
      <div key={label}>
        <div className="mb-1 font-mono text-[9px] text-subtle">{label}</div>
        <div className="flex h-[30px] items-center rounded-[2px] border border-border bg-chrome px-3 font-mono text-[11px] text-soft">
          {value}
        </div>
      </div>
    ))}
  </div>
);

function ControlledSheet(props: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(props.defaultOpen);

  return (
    <div className="relative h-[420px] w-[900px] bg-muted">
      <p className="p-4 font-mono text-xs text-subtle">
        Compact-tier centre content sits above the docked sheet.
      </p>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="VIEW & FILTERS"
        peek={
          <div className="flex items-center justify-between font-mono text-[10px] text-subtle">
            <span>Last 30 days · Daily · Project × Model</span>
            <span className="text-soft">Tap to expand</span>
          </div>
        }
      >
        {filterFields}
      </BottomSheet>
    </div>
  );
}

const meta: Meta<typeof BottomSheet> = {
  title: 'Shell/BottomSheet',
  component: BottomSheet,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BottomSheet>;

export const Collapsed: Story = { render: () => <ControlledSheet defaultOpen={false} /> };

export const Expanded: Story = { render: () => <ControlledSheet defaultOpen={true} /> };
