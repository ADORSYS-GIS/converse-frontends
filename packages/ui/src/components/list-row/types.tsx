import type { ReactNode } from 'react';
import type { PressableProps, ViewProps } from 'react-native';

import type { ListRowVariantProps } from './cva';

export type ListRowProps = (ViewProps | PressableProps) &
  ListRowVariantProps & {
    title: ReactNode;
    subtitle?: ReactNode;
    leading?: ReactNode;
    trailing?: ReactNode;
    onPress?: PressableProps['onPress'];
  };
