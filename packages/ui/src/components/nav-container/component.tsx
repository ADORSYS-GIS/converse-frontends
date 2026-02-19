import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { navContainerVariants } from './cva';
import type { NavContainerProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function NavContainer({ placement, ...props }: NavContainerProps) {
  return <ViewBase className={cn(navContainerVariants({ placement }))} {...props} />;
}
