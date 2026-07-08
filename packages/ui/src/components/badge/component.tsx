import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { badgeTextVariants, badgeVariants } from './cva';
import type { BadgeProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

export function Badge({ tone, size, icon, children, ...props }: BadgeProps) {
  return (
    <ViewBase className={cn(badgeVariants({ tone, size }))} {...props}>
      {icon}
      <TextBase className={cn(badgeTextVariants({ tone, size }))} numberOfLines={1}>
        {children}
      </TextBase>
    </ViewBase>
  );
}
