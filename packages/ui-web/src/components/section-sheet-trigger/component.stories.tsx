import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SelectField } from '../select-field';
import { SectionSheetTrigger } from './component';

const meta: Meta<typeof SectionSheetTrigger> = {
  title: 'Shell/SectionSheetTrigger',
  component: SectionSheetTrigger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SectionSheetTrigger>;

const filters = (
  <div className="flex flex-col gap-4">
    <SelectField
      label="Account"
      value="adorsys-gis"
      options={[{ value: 'adorsys-gis', label: 'adorsys-gis' }]}
      onChange={() => {}}
    />
  </div>
);

// The trigger is `lg:hidden` by contract, so the meaningful story sits below `lg`.
export const CompactTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => (
    <div className="flex items-center justify-between gap-2 p-4">
      <span className="text-subtle font-mono text-[11px] tracking-[.09em] uppercase">
        SPEND — BY PROJECT AND MODEL
      </span>
      <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
        {filters}
      </SectionSheetTrigger>
    </div>
  ),
};

// The controlled form (ADR 0010: an uncontrolled convenience must always offer one). `apps/console`
// is the consumer that needs it — ADR 0011 keeps *which rail section is open* in the query string,
// so the sheet must open from a link and close on Back, neither of which an internally-owned flag
// can do. Here a plain `useState` stands in for that param: the story mounts with the sheet already
// open, which an uncontrolled trigger cannot express at all.
export const Controlled: Story = {
  globals: { viewport: { value: 'md900' } },
  render: function ControlledStory() {
    const [open, setOpen] = React.useState(true);
    return (
      <div className="flex items-center justify-between gap-2 p-4">
        <span className="text-subtle font-mono text-[11px] tracking-[.09em] uppercase">
          open: {String(open)}
        </span>
        <SectionSheetTrigger
          icon="filter"
          triggerLabel="Open filters"
          label="Filters"
          open={open}
          onOpenChange={setOpen}>
          {filters}
        </SectionSheetTrigger>
      </div>
    );
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `AllGlyphs` -- the icon glyphs use
// `currentColor` off `text-subtle`, so this confirms none of the five is a hardcoded dark stroke.
export const AllGlyphsLight: Story = {
  name: 'All Glyphs — wireframe (light)',
  globals: { viewport: { value: 'md900' }, theme: 'wireframe' },
  render: () => (
    <div className="flex items-center gap-2 p-4">
      <SectionSheetTrigger icon="view" triggerLabel="Open view options" label="View">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="export" triggerLabel="Open export" label="Export">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label="Scope">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="report" triggerLabel="Open monthly report" label="Monthly report">
        {filters}
      </SectionSheetTrigger>
    </div>
  ),
};

// Every glyph in the set, so a reviewer can see them side by side against the mockups.
export const AllGlyphs: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => (
    <div className="flex items-center gap-2 p-4">
      <SectionSheetTrigger icon="view" triggerLabel="Open view options" label="View">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="export" triggerLabel="Open export" label="Export">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label="Scope">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="report" triggerLabel="Open monthly report" label="Monthly report">
        {filters}
      </SectionSheetTrigger>
    </div>
  ),
};
