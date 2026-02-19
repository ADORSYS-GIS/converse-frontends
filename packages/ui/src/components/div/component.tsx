import React from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { cn } from '../../cn';
import { divVariants } from './cva';
import type { DivProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

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
  return (
    <ViewBase
      className={cn(
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
      )}
      {...props}
    />
  );
}
