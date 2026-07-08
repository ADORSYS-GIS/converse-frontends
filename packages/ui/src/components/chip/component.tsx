import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PressableProps, TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { chipTextVariants, chipVariants } from './cva';
import type { ChipProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

export function Chip({
  children,
  onRemove,
  removeAccessibilityLabel,
  disabled,
  tone,
  size,
  ...props
}: ChipProps) {
  return (
    <ViewBase className={cn(chipVariants({ tone, size }))} {...props}>
      <TextBase className={cn(chipTextVariants({ tone, size }))} numberOfLines={1}>
        {children}
      </TextBase>
      {onRemove ? (
        <PressableBase
          accessibilityRole="button"
          accessibilityLabel={removeAccessibilityLabel}
          disabled={disabled}
          onPress={onRemove}
          className="h-4 w-4 items-center justify-center">
          <TextBase className={cn(chipTextVariants({ tone, size }))}>×</TextBase>
        </PressableBase>
      ) : null}
    </ViewBase>
  );
}
