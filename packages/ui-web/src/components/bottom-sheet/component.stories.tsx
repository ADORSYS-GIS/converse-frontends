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
// the console's only drawer idiom, and (owner's locked layout contract, 2026-08-30 restatement:
// "Right rail on large screens, bottom sheet on medium and small. Not from sides.") the console's
// ONLY sheet edge. Below `lg`, this is what row/request detail opens as, in place of the removed
// side-docked `DetailSheet` — see `projects-centre.tsx`/`admin-centre.tsx` (apps/console) for the
// real `portalClassName="lg:hidden"` gating this story doesn't need (it always renders below the
// rail's own breakpoint).
function ModalDrawer({ subtitle, footer }: { subtitle?: string; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-muted relative flex h-[420px] w-[900px] items-start p-4">
      <Button type="button" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="View & filters"
        subtitle={subtitle}
        footer={footer}>
        {filterFields}
      </BottomSheet>
    </div>
  );
}

const meta: Meta<typeof BottomSheet> = {
  title: 'Primitives/Overlays/BottomSheet',
  component: BottomSheet,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BottomSheet>;

// Standard modal drawer, closed by default — click "Open drawer" to mount it.
export const Default: Story = { render: () => <ModalDrawer /> };

// The row-detail shape `projects-centre.tsx`/`admin-centre.tsx` actually use below `lg`: a
// subtitle line under the title, and a sticky footer for the sheet's own action(s).
export const WithSubtitleAndFooter: Story = {
  render: () => (
    <ModalDrawer
      subtitle="adorsys-gis"
      footer={
        <Button type="button" variant="secondary" size="sm">
          Rename
        </Button>
      }
    />
  ),
};

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
