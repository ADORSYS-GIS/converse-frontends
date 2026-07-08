import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Heading } from '../heading';
import { Stack } from '../stack';
import { Text } from '../text';
import { Page } from './component';

// Page is `flex-1` — it fills its parent. In isolation it needs a bounded,
// visibly-framed parent, otherwise it collapses to its content height and reads
// as a random box. This frame mimics a phone-sized viewport.
const Frame = (Story: React.ComponentType) => (
  <div
    style={{
      width: 320,
      height: 420,
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.12)',
      display: 'flex',
    }}>
    <Story />
  </div>
);

const meta: Meta<typeof Page> = {
  title: 'UI/Page',
  component: Page,
  decorators: [Frame],
  args: {
    children: (
      <Stack gap="sm">
        <Heading tone="title">Screen title</Heading>
        <Text>Page content sits inside a full-height screen surface.</Text>
      </Stack>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Page>;

export const Muted: Story = { args: { tone: 'muted' } };
export const Surface: Story = { args: { tone: 'surface' } };
