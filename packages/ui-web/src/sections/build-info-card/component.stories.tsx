import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BuildInfoCard } from './component';
import {
  buildInfoAllKnown,
  buildInfoError,
  buildInfoLoading,
  buildInfoPartiallyUnavailable,
} from './fixtures';

const meta: Meta<typeof BuildInfoCard> = {
  title: 'Sections/Settings/BuildInfoCard',
  component: BuildInfoCard,
  parameters: { layout: 'fullscreen' },
  args: buildInfoAllKnown,
  decorators: [
    (Story) => (
      <div className="max-w-[720px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BuildInfoCard>;

/** The shape a correctly-deployed estate reports: every service on the same commit. */
export const AllKnown: Story = {};

export const AllKnownLight: Story = {
  name: 'All known — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/**
 * The state this card actually exists for. One service still answering, one genuinely not
 * deployed, one reporting the backend's own `unknown` sentinel for a build with no git context —
 * three different kinds of "no value", rendered three different ways rather than three blanks.
 */
export const PartiallyUnavailable: Story = { args: buildInfoPartiallyUnavailable };

export const PartiallyUnavailableLight: Story = {
  name: 'Partially unavailable — wireframe (light)',
  args: buildInfoPartiallyUnavailable,
  globals: { theme: 'wireframe' },
};

/** Every backend refused. The console's own row still renders — it never depended on one. */
export const ErrorState: Story = { name: 'Error', args: buildInfoError };

export const Loading: Story = { args: buildInfoLoading };

/** The compact tier: the rows wrap their value under the label rather than scrolling the page. */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
