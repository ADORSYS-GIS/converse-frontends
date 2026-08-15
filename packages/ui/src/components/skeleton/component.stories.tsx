import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Div } from '../div';
import { Stack } from '../stack';
import { Skeleton } from './component';

// Skeleton widths default to "100%", and the Storybook canvas root has no intrinsic
// width — without a sized parent every percentage-width story would collapse to 0px
// and look identical to the NativeWind-drops-the-className bug this story guards.
const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  decorators: [
    (Story) => (
      <Div style={{ width: 320 }}>
        <Story />
      </Div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {};

export const Rounded: Story = {
  render: () => (
    <Stack gap="md">
      <Skeleton rounded="sm" height={20} />
      <Skeleton rounded="md" height={20} />
      <Skeleton rounded="xl" height={20} />
      <Skeleton rounded="full" height={20} />
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="sm">
      <Skeleton width={160} height={12} />
      <Skeleton width="60%" height={14} />
      <Skeleton height={14} />
      <Skeleton rounded="full" width={40} height={40} />
    </Stack>
  ),
};

/** How the four shipped loading states compose it: a stack of text-shaped lines. */
export const TextBlock: Story = {
  render: () => (
    <Stack gap="sm">
      <Skeleton width={120} height={12} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="80%" height={14} />
    </Stack>
  ),
};
