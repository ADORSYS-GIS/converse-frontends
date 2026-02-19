import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { cardVariants } from './cva';
import type { CardProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Card({ size, ...props }: CardProps) {
  return <ViewBase className={cn(cardVariants({ size }))} {...props} />;
}
