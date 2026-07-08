import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { ChipVariantProps } from './cva';

export type ChipProps = ViewProps &
  ChipVariantProps & {
    children: ReactNode;
    onRemove?: () => void;
    removeAccessibilityLabel?: string;
    disabled?: boolean;
  };
