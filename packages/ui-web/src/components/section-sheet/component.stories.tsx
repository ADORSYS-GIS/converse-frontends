import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { SectionSheet } from './component';

function FilterIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
    </svg>
  );
}

const filterFields = (
  <div className="flex flex-col gap-3">
    {[
      ['Status', 'All'],
      ['Search', 'name or prefix…'],
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

// The contextual trigger + sheet pair a page composes for one rail section (console-ui skill
// "Shape and layout", 2026-08-25 revision) — a 30×30 ghost icon button in context (here, a table
// toolbar) opens just that section's own content, not the whole rail.
function TriggerAndSheet() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-[420px] w-[900px] flex-col bg-muted p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-subtle">23 active · 4 revoked</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Open filters" onClick={() => setOpen(true)}>
          <FilterIcon />
        </Button>
      </div>
      <SectionSheet open={open} onOpenChange={setOpen} label="FILTERS">
        {filterFields}
      </SectionSheet>
    </div>
  );
}

const meta: Meta<typeof SectionSheet> = {
  title: 'Shell/SectionSheet',
  component: SectionSheet,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SectionSheet>;

export const TriggerInContext: Story = { render: () => <TriggerAndSheet /> };

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="relative h-[420px] w-[900px] bg-muted">
        <SectionSheet open={open} onOpenChange={setOpen} label="FILTERS">
          {filterFields}
        </SectionSheet>
      </div>
    );
  },
};
