import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Button } from '../button';
import { Heading } from '../heading';
import { TextField } from '../text-field';
import { Toolbar } from './component';

const meta: Meta<typeof Toolbar> = {
  title: 'UI/Toolbar',
  component: Toolbar,
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const SearchAndCreate: Story = {
  args: {
    leading: (
      <div style={{ maxWidth: 320, width: '100%' }}>
        <TextField placeholder="Search API keys" />
      </div>
    ),
    trailing: <Button size="sm">New key</Button>,
  },
};

export const TitleWithActions: Story = {
  args: {
    leading: <Heading tone="subtitle">4 active keys</Heading>,
    trailing: (
      <>
        <Button variant="neutral" size="sm">
          Filter
        </Button>
        <Button size="sm">New key</Button>
      </>
    ),
  },
};

export const WithBottomBorder: Story = {
  args: {
    border: true,
    leading: <Heading tone="subtitle">Projects</Heading>,
    trailing: <Button size="sm">New project</Button>,
  },
};
