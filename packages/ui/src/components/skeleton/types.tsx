import type { ViewProps } from 'react-native';

import type { SkeletonVariantProps } from './cva';

export type SkeletonProps = ViewProps &
  SkeletonVariantProps & {
    /** Width in px (or a percentage string, e.g. "60%"). Defaults to "100%". */
    width?: number | `${number}%`;
    /** Height in px. Defaults to 14 (roughly one line of body text). */
    height?: number;
  };
