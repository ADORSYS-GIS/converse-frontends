import React from 'react';
import { BlurView } from 'expo-blur';
import type { BlurViewProps } from 'expo-blur';

import { cn } from '../../cn';
import { blurVariants } from './cva';
import type { BlurProps } from './types';

const BlurViewBase = BlurView as React.ComponentType<BlurViewProps & { className?: string }>;

export function Blur({ radius, ...props }: BlurProps) {
  return <BlurViewBase className={cn(blurVariants({ radius }))} {...props} />;
}
