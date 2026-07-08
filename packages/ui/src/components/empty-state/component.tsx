import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { Text } from '../text';
import { emptyStateVariants } from './cva';
import type { EmptyStateProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function EmptyState({ pad, title, description, icon, action, ...props }: EmptyStateProps) {
  return (
    <ViewBase className={cn(emptyStateVariants({ pad }))} {...props}>
      <Stack gap="sm" align="center">
        {icon}
        <Text intent="bodyStrong" align="center">
          {title}
        </Text>
        {description ? (
          <Text intent="caption" align="center">
            {description}
          </Text>
        ) : null}
        {action ? <Stack top="sm">{action}</Stack> : null}
      </Stack>
    </ViewBase>
  );
}
