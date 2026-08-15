import type { ViewProps } from 'react-native';

import type { AvatarVariantProps } from './cva';

export type AvatarProps = ViewProps &
  AvatarVariantProps & {
    /** Full name used to derive fallback initials and the default accessibility label. */
    name: string;
    /** Image URI. When omitted the initials fallback renders instead. */
    src?: string;
  };
