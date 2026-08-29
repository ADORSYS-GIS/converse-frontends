import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { OverviewToolbar } from './component';
import type { OverviewToolbarField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_OPTIONS,
} from './fixtures';

function field(label: string, value: string, options: OverviewToolbarField['options']): OverviewToolbarField {
  return { label, value, options, onChange: () => {} };
}

const meta: Meta<typeof OverviewToolbar> = {
  title: 'Sections/OverviewToolbar',
  component: OverviewToolbar,
  parameters: { layout: 'padded' },
  args: {
    rangeField: field('Range', 'last-30', RANGE_OPTIONS),
    bucketField: field('Bucket', 'daily', BUCKET_OPTIONS),
    groupByField: field('Group by', 'project-model', GROUP_BY_OPTIONS),
    projectField: field('Project', 'all', PROJECT_FILTER_OPTIONS),
    modelField: field('Model', 'all', MODEL_FILTER_OPTIONS),
    onExport: () => {},
  },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OverviewToolbar>;

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

/**
 * `md` (600–1024): the row wraps rather than switching to a different layout. This is the whole
 * point of replacing the rail — one arrangement, at every tier.
 */
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
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
    const [range, setRange] = useState('last-30');
    const [project, setProject] = useState('all');
    return (
      <OverviewToolbar
        {...args}
        rangeField={{ ...args.rangeField, value: range, onChange: setRange }}
        projectField={{ ...args.projectField, value: project, onChange: setProject }}
      />
    );
  },
};
