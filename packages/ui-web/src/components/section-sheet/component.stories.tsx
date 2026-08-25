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
        <div className="text-subtle mb-1 font-mono text-[9px]">{label}</div>
        <div className="border-border bg-chrome text-soft flex h-[30px] items-center rounded-[2px] border px-3 font-mono text-[11px]">
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
    <div className="bg-muted flex h-[420px] w-[900px] flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="text-subtle font-mono text-[11px]">23 active · 4 revoked</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open filters"
          onClick={() => setOpen(true)}>
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

// `SectionSheet` only ever opens below `lg` (1024px) -- `useIsBelowLg` gates it independently of
// the caller's own `open` state (see the component's docstring). Storybook's default viewport is
// `lg1440`, so both stories below force the compact `md900` tier or the sheet never appears --
// found during the ADR 0010 phase 4 sweep, where "Open" rendered as a blank canvas in both themes.
export const TriggerInContext: Story = {
  render: () => <TriggerAndSheet />,
  globals: { viewport: { value: 'md900' } },
};

// A component, not an inline `render` body: hooks may only be called from a component or another
// hook, and a story's `render` is neither (`react-hooks/rules-of-hooks`).
function OpenSheet() {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-muted relative h-[420px] w-[900px]">
      <SectionSheet open={open} onOpenChange={setOpen} label="FILTERS">
        {filterFields}
      </SectionSheet>
    </div>
  );
}

export const Open: Story = {
  render: () => <OpenSheet />,
  globals: { viewport: { value: 'md900' } },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Open`.
export const OpenLight: Story = {
  name: 'Open — wireframe (light)',
  render: () => <OpenSheet />,
  globals: { viewport: { value: 'md900' }, theme: 'wireframe' },
};
