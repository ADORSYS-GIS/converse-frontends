import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import type { NavItemVariantProps } from './cva';

export type NavItemProps = PressableProps &
  NavItemVariantProps & {
    label: string;
    icon?: ReactNode;
    showLabel?: boolean;
  };
