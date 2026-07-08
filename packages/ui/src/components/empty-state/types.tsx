import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { EmptyStateVariantProps } from './cva';

export type EmptyStateProps = ViewProps &
  EmptyStateVariantProps & {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
  };
