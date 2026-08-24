import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
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

// Compact-tier dock: peek mode keeps the sheet mounted (vaul snapPoints, non-modal) and
// toggles between a one-line peek summary and the full content — the right rail at 600–1024
// (shell-compact.svg).
function DockedSheet(props: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(props.defaultOpen);

  return (
    <div className="relative h-[420px] w-[900px] bg-muted">
      <p className="p-4 font-mono text-xs text-subtle">
        Compact-tier centre content stays interactive underneath the docked sheet.
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

// Transient modal drawer: mounts on `open` behind a `muted/80` backdrop and unmounts on
// close — the plain vaul idiom for one-off overlays (e.g. nav overflow) that have no docked
// peek state.
function ModalDrawer(props: { direction?: 'bottom' | 'right' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-[420px] w-[900px] items-start bg-muted p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={props.direction === 'right' ? 'NAV OVERFLOW' : 'DRAWER'}
        direction={props.direction}
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

// Standard vaul modal drawer, closed by default — click "Open drawer" to mount it.
export const Default: Story = { render: () => <ModalDrawer /> };

// Peek/snap behaviour: collapsed at the low snap point, showing the peek summary row.
export const PeekCollapsed: Story = { render: () => <DockedSheet defaultOpen={false} /> };

// Peek/snap behaviour: expanded to the full snap point, showing the full content.
export const PeekExpanded: Story = { render: () => <DockedSheet defaultOpen={true} /> };

// direction="right" — the same primitive serving a side drawer (e.g. mobile nav overflow).
export const RightSide: Story = { render: () => <ModalDrawer direction="right" /> };
