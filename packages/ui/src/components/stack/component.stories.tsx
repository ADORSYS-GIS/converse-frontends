import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Div } from '../div';
import { Text } from '../text';
import { Stack } from './component';

function Chip({ label }: Readonly<{ label: string }>) {
  return (
    <Div tone="brandSoft" rounded="md" pad="sm">
      <Text intent="bodyStrong">{label}</Text>
    </Div>
  );
}

const meta: Meta<typeof Stack> = {
  title: 'UI/Stack',
  component: Stack,
  args: {
    gap: 'sm',
    children: (
      <>
        <Chip label="One" />
        <Chip label="Two" />
        <Chip label="Three" />
      </>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Column: Story = { args: { direction: 'column' } };
export const Row: Story = { args: { direction: 'row' } };
export const RowWrap: Story = { args: { direction: 'row', wrap: 'wrap' } };
export const JustifyBetween: Story = { args: { direction: 'row', justify: 'between', width: 'full' } };
export const Centered: Story = { args: { direction: 'row', align: 'center', justify: 'center' } };
