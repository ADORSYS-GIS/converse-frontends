import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

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
        <div className="text-subtle mb-1 font-mono text-[9px]">{label}</div>
        <div className="border-border bg-chrome text-soft flex h-[30px] items-center rounded-[2px] border px-3 font-mono text-[11px]">
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
    <div className="bg-muted relative flex h-[420px] w-[900px] items-start p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={props.direction === 'right' ? 'NAV OVERFLOW' : 'VIEW & FILTERS'}
        direction={props.direction}>
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

// Standard modal drawer, closed by default — click "Open drawer" to mount it.
export const Default: Story = { render: () => <ModalDrawer /> };

// direction="right" — the same primitive serving a side drawer (e.g. mobile nav overflow).
export const RightSide: Story = { render: () => <ModalDrawer direction="right" /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Default`, opened via a `play`
// function -- confirms the portalled backdrop (`bg-muted/80`) and panel (`bg-surface`, white)
// both track `data-theme` even though the drawer renders outside the decorator's own subtree.
export const DefaultLightOpen: Story = {
  name: 'Default — wireframe (light), open',
  globals: { theme: 'wireframe' },
  render: () => <ModalDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open drawer' }));
  },
};
