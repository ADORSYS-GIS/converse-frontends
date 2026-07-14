import React from 'react';
import type { PressableProps, StyleProp, ViewProps, ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native';

import { cn } from '../../cn';
import { divVariants } from './cva';
import type { DivProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

export function Div({
  pad,
  tone,
  rounded,
  shadow,
  size,
  height,
  width,
  maxWidth,
  self,
  align,
  justify,
  style,
  ...props
}: DivProps) {
  const className = cn(
    divVariants({
      pad,
      tone,
      rounded,
      shadow,
      size,
      height,
      width,
      maxWidth,
      self,
      align,
      justify,
    })
  );

  if (
    typeof (props as PressableProps).onPress === 'function' ||
    typeof (props as PressableProps).onLongPress === 'function'
  ) {
    const { style: _style, ...restProps } = props as PressableProps;
    return (
      <PressableBase
        className={className}
        style={({ pressed }) =>
          [style, pressed ? { opacity: 0.7 } : undefined] as StyleProp<ViewStyle>
        }
        {...restProps}
      />
    );
  }

  return <ViewBase className={className} style={style as StyleProp<ViewStyle>} {...(props as ViewProps)} />;
}
