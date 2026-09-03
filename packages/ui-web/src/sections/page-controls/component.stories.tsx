import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { DateRangeField } from '../../components/date-range-field';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { PageHeader } from '../page-header';
import { PageControls } from './component';
import type { PageControlsGroup } from './types';

const meta: Meta<typeof PageControls> = {
  title: 'Shell/PageControls',
  component: PageControls,
};

export default meta;
type Story = StoryObj<typeof PageControls>;

const RANGE_PRESETS = [
  { value: 'mtd', label: 'This month', days: 'mtd' as const },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];

const RANGE = { from: new Date('2026-08-04T00:00:00Z'), to: new Date('2026-09-03T00:00:00Z') };

function rangeGroup(): PageControlsGroup {
  return {
    id: 'window',
    label: 'Time window',
    children: (
      <DateRangeField
        label="Range"
        presets={RANGE_PRESETS}
        preset="30d"
        value={RANGE}
        today={RANGE.to}
        onPresetChange={() => {}}
        onRangeChange={() => {}}
        layout="inline"
        hideLabel
      />
    ),
  };
}

// SPARSE — the shape most dashboard screens are: one window, one action group. The row is still a
// row, and the page below it is still cards holding nothing but content.
export const Sparse: Story = {
  args: {
    label: 'View',
    groups: [
      rangeGroup(),
      {
        id: 'report',
        label: 'Report',
        align: 'end',
        children: (
          <Button type="button" variant="secondary" size="sm">
            Export
          </Button>
        ),
      },
    ],
  },
};

// DENSE — every kind of control this row is allowed to carry, in the three groups the hairlines
// part: what window, which slice, how much of it. `onReset` adds the fourth, trailing group.
export const Dense: Story = {
  args: {
    label: 'Filters',
    onReset: () => {},
    groups: [
      rangeGroup(),
      {
        id: 'slice',
        label: 'Slice',
        children: (
          <>
            <SegmentedControl
              aria-label="Session status filter"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'all', label: 'All' },
              ]}
              value="active"
              onChange={() => {}}
            />
            <SelectField
              label="Project"
              layout="inline"
              hideLabel
              value="gateway-prod"
              options={[
                { value: 'gateway-prod', label: 'gateway-prod' },
                { value: 'gateway-staging', label: 'gateway-staging' },
              ]}
              onChange={() => {}}
            />
            <Field
              label="Search"
              layout="inline"
              hideLabel
              placeholder="name or prefix…"
              value=""
              onChange={() => {}}
            />
          </>
        ),
      },
      {
        id: 'paging',
        label: 'Rows per page',
        align: 'end',
        children: (
          <SelectField
            label="Per page"
            layout="inline"
            value="25"
            options={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            onChange={() => {}}
          />
        ),
      },
    ],
  },
};

// WRAPPING at 390 — the mobile tier. The dividers go away (a hairline at the start of a wrapped
// line separates nothing) and the trailing group stops claiming the far edge, so the whole row
// reads as one stack of controls rather than a broken toolbar.
export const Wrapping390: Story = {
  name: 'Dense — 390 (wrapping)',
  args: Dense.args,
  globals: { viewport: { value: 'base390' } },
};

// IN PLACE — the whole point of the component: header, then the control row on the floor, then a
// card that holds content and nothing else.
export const OnAScreen: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sessions"
        subtitle="Estate-wide · 24 sessions"
        action={
          <Button type="button" variant="primary">
            Close all
          </Button>
        }
      />
      <PageControls {...args} />
      <Card>
        <p className="text-soft text-[13px]">The ledger. Content only — no toolbar in here.</p>
      </Card>
    </div>
  ),
  args: Dense.args,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart. A hairline drawn from a hard-coded colour
// would only be visible in one of the two themes.
export const DenseLight: Story = {
  name: 'Dense — wireframe (light)',
  args: Dense.args,
  globals: { theme: 'wireframe' },
};
