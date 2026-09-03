import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { PageHeader } from './component';

const meta: Meta<typeof PageHeader> = {
  title: 'Shell/PageHeader',
  component: PageHeader,
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: { title: 'Overview', subtitle: 'adorsys-gis · last 30 days · UTC' },
};

// One action, never a cluster of parameters — those are `Shell/PageControls`, the row below.
export const WithAction: Story = {
  args: {
    title: 'API keys',
    subtitle: 'adorsys-gis / gateway-prod',
    action: (
      <Button type="button" variant="primary">
        + New key
      </Button>
    ),
  },
};

export const TitleOnly: Story = { args: { title: 'Projects' } };

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  args: Default.args,
  globals: { theme: 'wireframe' },
};
