import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Div } from '../div';
import { Stack } from '../stack';
import { Text } from '../text';
import { Scroll } from './component';

const meta: Meta<typeof Scroll> = {
  title: 'UI/Scroll',
  component: Scroll,
  args: {
    tone: 'muted',
    pad: 'md',
    children: (
      <Stack gap="sm">
        {Array.from({ length: 12 }, (_, i) => (
          <Div key={i} tone="surface" rounded="md" pad="md">
            <Text>Row {i + 1}</Text>
          </Div>
        ))}
      </Stack>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Scroll>;

export const Default: Story = {
  decorators: [(Story) => <div style={{ height: 320 }}><Story /></div>],
};
