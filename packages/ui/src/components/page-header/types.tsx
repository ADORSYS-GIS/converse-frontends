import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { PageHeaderVariantProps } from './cva';

export type PageHeaderProps = ViewProps &
  PageHeaderVariantProps & {
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
  };
