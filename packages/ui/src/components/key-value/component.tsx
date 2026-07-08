import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Text } from '../text';
import { keyValueVariants } from './cva';
import type { KeyValueProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function KeyValue({ label, value, layout, ...props }: KeyValueProps) {
  return (
    <ViewBase className={cn(keyValueVariants({ layout }))} {...props}>
      <Text intent="caption">{label}</Text>
      {typeof value === 'string' ? (
        <Text intent="bodyStrong" numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
      ) : (
        value
      )}
    </ViewBase>
  );
}
