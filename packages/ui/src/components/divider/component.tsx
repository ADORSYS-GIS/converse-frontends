import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { dividerVariants } from './cva';
import type { DividerProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Divider({ orientation, tone, ...props }: DividerProps) {
  return (
    <ViewBase
      accessibilityRole="none"
      className={cn(dividerVariants({ orientation, tone }))}
      {...props}
    />
  );
}
