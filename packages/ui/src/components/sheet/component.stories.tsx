import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Sheet } from './component';

const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  render: () => (
    <GestureHandlerRootView style={{ height: 460, width: 360 }}>
      <Sheet onClose={() => undefined} snapPoints={['70%']}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text intent="bodyStrong">Bottom sheet</Text>
          <Text intent="caption">Drag the handle down or tap the backdrop to dismiss.</Text>
        </View>
      </Sheet>
    </GestureHandlerRootView>
  ),
};
