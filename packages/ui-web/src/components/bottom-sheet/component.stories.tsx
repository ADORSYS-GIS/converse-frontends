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

// Transient modal drawer: mounts on `open` behind a `muted/80` backdrop and unmounts on close —
// the console's only drawer idiom (console-ui skill, 2026-08-25 revision: the compact right rail
// no longer docks as a persistent peek/footer bar; every below-`lg` sheet, whether nav overflow
// or a `SectionSheet`-wrapped rail section, is this same transient drawer).
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
        title={props.direction === 'right' ? 'NAV OVERFLOW' : 'VIEW & FILTERS'}
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

// direction="right" — the same primitive serving a side drawer (e.g. mobile nav overflow).
export const RightSide: Story = { render: () => <ModalDrawer direction="right" /> };
