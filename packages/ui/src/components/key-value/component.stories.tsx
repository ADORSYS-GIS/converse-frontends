import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Card } from '../card';
import { Divider } from '../divider';
import { Stack } from '../stack';
import { KeyValue } from './component';

const meta: Meta<typeof KeyValue> = {
  title: 'UI/KeyValue',
  component: KeyValue,
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KeyValue>;

export const Row: Story = {
  args: { label: 'Signed in as', value: 'jane@example.com' },
};

export const Stacked: Story = {
  args: { layout: 'stacked', label: 'Issuer', value: 'https://issuer.example.com/realms/lightbridge' },
};

export const InCard: Story = {
  render: () => (
    <Card size="md">
      <Stack gap="sm">
        <KeyValue label="Signed in as" value="jane@example.com" />
        <Divider tone="muted" />
        <KeyValue label="Issuer" value="https://issuer.example.com/realms/lightbridge" />
      </Stack>
    </Card>
  ),
};
