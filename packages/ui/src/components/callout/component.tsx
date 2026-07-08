import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { calloutTextVariants, calloutVariants } from './cva';
import type { CalloutProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

export function Callout({ tone, icon, children, ...props }: CalloutProps) {
  return (
    <ViewBase className={cn(calloutVariants({ tone }))} {...props}>
      {icon}
      <TextBase className={cn(calloutTextVariants({ tone }))}>{children}</TextBase>
    </ViewBase>
  );
}
