import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailSelect } from '../rail-select';
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
    <RailSelect
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
      <span className="font-mono text-[11px] uppercase tracking-[.09em] text-subtle">
        SPEND — BY PROJECT AND MODEL
      </span>
      <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="FILTERS">
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
      <SectionSheetTrigger icon="view" triggerLabel="Open view options" label="VIEW">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="FILTERS">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="export" triggerLabel="Open export" label="EXPORT">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label="SCOPE">
        {filters}
      </SectionSheetTrigger>
      <SectionSheetTrigger icon="report" triggerLabel="Open monthly report" label="MONTHLY REPORT">
        {filters}
      </SectionSheetTrigger>
    </div>
  ),
};
