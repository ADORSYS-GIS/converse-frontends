import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { pageVariants } from './cva';
import type { PageProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Page({ tone, pad, ...props }: PageProps) {
  return <ViewBase className={cn(pageVariants({ tone, pad }))} {...props} />;
}
