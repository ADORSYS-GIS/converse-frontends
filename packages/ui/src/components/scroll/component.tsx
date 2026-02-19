import React from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { scrollContentVariants, scrollVariants } from './cva';
import type { ScrollProps } from './types';

const ScrollBase = ScrollView as React.ComponentType<ScrollViewProps & { className?: string }>;
const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Scroll({ tone, pad, children, ...props }: ScrollProps) {
  return (
    <ScrollBase className={cn(scrollVariants({ tone }))} {...props}>
      <ViewBase className={cn(scrollContentVariants({ pad }))}>{children}</ViewBase>
    </ScrollBase>
  );
}
