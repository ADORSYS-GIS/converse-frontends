import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import type { PressableProps, TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { chipTextVariants, chipVariants } from './cva';
import type { ChipProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

const monoFontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

export function Chip({
  children,
  onRemove,
  removeAccessibilityLabel,
  disabled,
  tone,
  size,
  mono,
  style,
  ...props
}: ChipProps) {
  return (
    <ViewBase
      className={cn(chipVariants({ tone, size }))}
      style={[{ maxWidth: '100%', flexShrink: 1 }, style]}
      {...props}>
      <TextBase
        className={cn(chipTextVariants({ tone, size }))}
        style={[{ flexShrink: 1, minWidth: 0 }, mono ? { fontFamily: monoFontFamily } : null]}
        numberOfLines={1}
        ellipsizeMode="tail">
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
