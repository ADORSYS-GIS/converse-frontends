import React from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { Text } from '../text';
import { listRowVariants } from './cva';
import type { ListRowProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

// Slots accept either a string (wrapped in the right Text intent) or a node
// (rendered as-is, so callers can drop in a Badge, chips, etc.).
function renderSlot(value: ReactNode, strong: boolean) {
  if (typeof value === 'string') {
    return (
      <Text intent={strong ? 'bodyStrong' : 'caption'} numberOfLines={1}>
        {value}
      </Text>
    );
  }
  return value;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  tone,
  pad,
  rounded,
  onPress,
  ...props
}: ListRowProps) {
  const className = cn(listRowVariants({ tone, pad, rounded }));

  const content = (
    <Stack direction="row" align="center" gap="sm" width="full">
      {leading}
      <Stack style={{ flex: 1 }}>
        {renderSlot(title, true)}
        {subtitle ? renderSlot(subtitle, false) : null}
      </Stack>
      {trailing}
    </Stack>
  );

  if (onPress) {
    return (
      <PressableBase
        accessibilityRole="button"
        className={className}
        onPress={onPress}
        {...(props as PressableProps)}>
        {content}
      </PressableBase>
    );
  }

  return (
    <ViewBase className={className} {...(props as ViewProps)}>
      {content}
    </ViewBase>
  );
}
