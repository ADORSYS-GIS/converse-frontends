import React from 'react';
import type { PressableProps, TextProps } from 'react-native';
import { Pressable, Text } from 'react-native';

import { cn } from '../../cn';
import { AppFont } from '../../hooks/use-app-fonts';
import { buttonTextVariants, buttonVariants } from './cva';
import type { ButtonProps } from './types';

const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

export function Button({
  textProps,
  variant,
  shape,
  size,
  width,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolvedDisabled = Boolean(disabled);

  const textStyle = [{ fontFamily: AppFont.BakbakOne }, textProps?.style];

  return (
    <PressableBase
      accessibilityRole="button"
      disabled={resolvedDisabled}
      className={cn(buttonVariants({ variant, shape, size, width, disabled: resolvedDisabled }))}
      {...props}
    >
      <TextBase className={cn(buttonTextVariants({ variant, size }))} {...textProps} style={textStyle}>
        {children}
      </TextBase>
    </PressableBase>
  );
}
