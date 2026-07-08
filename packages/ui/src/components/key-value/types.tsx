import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { KeyValueVariantProps } from './cva';

export type KeyValueProps = ViewProps &
  KeyValueVariantProps & {
    label: string;
    value: ReactNode;
  };
