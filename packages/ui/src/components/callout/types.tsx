import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { CalloutVariantProps } from './cva';

export type CalloutProps = ViewProps &
  CalloutVariantProps & {
    children: ReactNode;
    icon?: ReactNode;
  };
