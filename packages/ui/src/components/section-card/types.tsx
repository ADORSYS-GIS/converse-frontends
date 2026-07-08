import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { SectionCardVariantProps } from './cva';

export type SectionCardProps = ViewProps &
  SectionCardVariantProps & {
    title: string;
    description?: string;
    action?: ReactNode;
    children?: ReactNode;
  };
