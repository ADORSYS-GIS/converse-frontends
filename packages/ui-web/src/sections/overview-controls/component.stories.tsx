import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { presetRange } from '../../components/date-range-field';
import { OverviewControls } from './component';
import type { OverviewControlsField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
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
      preset: '30d',
      presets: RANGE_PRESETS,
      value: presetRange(30, TODAY),
      today: TODAY,
      onPresetChange: () => {},
      onRangeChange: () => {},
    },
    bucketField: field('Bucket', 'daily', BUCKET_OPTIONS),
    groupByField: field('Group by', 'project-model', GROUP_BY_OPTIONS),
    projectField: field('Project', 'all', PROJECT_FILTER_OPTIONS),
    modelField: field('Model', 'all', MODEL_FILTER_OPTIONS),
    onExport: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-surface w-[240px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OverviewControls>;

export const Default: Story = {};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Export unavailable — the action stays visible but disabled, and says why on hover. Never a
 *  silently dead control. */
export const ExportUnavailable: Story = {
  args: { onExport: undefined, exportDisabledReason: "Export isn't available yet." },
};


/** Base tier (<600): the same row, wrapped to three or four lines. */
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
    return (
      <OverviewControls
        {...args}
        projectField={{ ...args.projectField, value: project, onChange: setProject }}
      />
    );
  },
};
