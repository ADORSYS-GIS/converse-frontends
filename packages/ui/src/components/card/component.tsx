import React from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { cardVariants } from './cva';
import type { CardProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

export function Card({ size, ...props }: CardProps) {
  const className = cn(cardVariants({ size }));

  if (
    typeof (props as PressableProps).onPress === 'function' ||
    typeof (props as PressableProps).onLongPress === 'function'
  ) {
    return <PressableBase className={className} {...(props as PressableProps)} />;
  }

  return <ViewBase className={className} {...(props as ViewProps)} />;
}
