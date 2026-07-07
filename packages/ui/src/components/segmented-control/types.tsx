import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { SegmentedControlVariantProps } from './cva';

export type SegmentedControlOption = {
  key: string;
  label: string;
  icon?: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export type SegmentedControlProps = Omit<ViewProps, 'children'> &
  SegmentedControlVariantProps & {
    options: SegmentedControlOption[];
    value: string;
    onChange: (key: string) => void;
  };
