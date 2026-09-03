import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { Card } from '../card';
import { EmptyState } from './component';

const meta: Meta<typeof EmptyState> = {
  title: 'Primitives/States/EmptyState',
  component: EmptyState,
  args: {
    headline: 'No api keys yet',
    explainer: 'Create one to start calling the API.',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <Button type="button" variant="primary" size="sm">
        + New key
      </Button>
    ),
  },
};

export const HeadlineOnly: Story = {
  args: { explainer: undefined },
};

export const InsideACard: Story = {
  render: (args) => (
    <Card title="Api-Keys">
      <EmptyState {...args} />
    </Card>
  ),
  args: {
    action: (
      <Button type="button" variant="primary" size="sm">
        + New key
      </Button>
    ),
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  args: Default.args,
  globals: { theme: 'wireframe' },
};
