import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { presetRange } from '../../components/date-range-field';
import { OverviewControls } from './component';
import type { OverviewControlsField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_PRESETS,
} from './fixtures';

function field(
  label: string,
  value: string,
  options: OverviewControlsField['options']
): OverviewControlsField {
  return { label, value, options, onChange: () => {} };
}

const TODAY = new Date(Date.UTC(2026, 7, 29));

const meta: Meta<typeof OverviewControls> = {
  title: 'Sections/OverviewControls',
  component: OverviewControls,
  parameters: { layout: 'padded' },
  args: {
    rangeField: {
      label: 'Range',
      preset: 'mtd',
      presets: RANGE_PRESETS,
      value: presetRange('mtd', TODAY),
      today: TODAY,
      onPresetChange: () => {},
      onRangeChange: () => {},
    },
    bucketField: field('Bucket', 'daily', BUCKET_OPTIONS),
    groupByField: field('Group by', 'project-model', GROUP_BY_OPTIONS),
    projectField: field('Project', 'all', PROJECT_FILTER_OPTIONS),
  },
};

export default meta;
type Story = StoryObj<typeof OverviewControls>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Account-wide (the admin overview omits a project filter — see `OverviewControlsProps.projectField`). */
export const NoProjectField: Story = {
  args: { projectField: undefined },
};

/** Base tier (<600): the row wraps rather than overflowing. */
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};

export const Interactive: Story = {
  render: function Render(args) {
    // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011).
    const [project, setProject] = useState('all');
    const { projectField } = args;
    return (
      <OverviewControls
        {...args}
        projectField={
          projectField ? { ...projectField, value: project, onChange: setProject } : undefined
        }
      />
    );
  },
};
