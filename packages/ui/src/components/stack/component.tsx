import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { stackVariants } from './cva';
import type { StackProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Stack({ direction, gap, align, justify, wrap, flex, top, width, ...props }: StackProps) {
  return (
    <ViewBase
      className={cn(stackVariants({ direction, gap, align, justify, wrap, flex, top, width }))}
      {...props}
    />
  );
}
