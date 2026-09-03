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

export const WithControlsAndAction: Story = {
  args: {
    title: 'Api-Keys',
    subtitle: 'adorsys-gis / gateway-prod',
    controls: (
      <Button type="button" variant="secondary" size="sm">
        Scope: gateway-prod
      </Button>
    ),
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
