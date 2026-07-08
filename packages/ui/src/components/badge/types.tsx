import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { BadgeVariantProps } from './cva';

export type BadgeProps = ViewProps &
  BadgeVariantProps & {
    children: ReactNode;
    icon?: ReactNode;
  };
