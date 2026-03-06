import React from 'react';
import type { PressableProps, ViewProps } from 'react-native';
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
    return <PressableBase className={className} {...(props as PressableProps)} />;
  }

  return <ViewBase className={className} {...(props as ViewProps)} />;
}
