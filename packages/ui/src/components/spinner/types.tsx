import type { ViewProps } from 'react-native';

import type { SpinnerVariantProps } from './cva';

export type SpinnerProps = ViewProps &
  SpinnerVariantProps & {
    /** Screen-reader label. Defaults to "Loading". */
    accessibilityLabel?: string;
  };
