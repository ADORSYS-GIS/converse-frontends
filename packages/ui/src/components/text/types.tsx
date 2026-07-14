import type { TextProps as RNTextProps } from 'react-native';

import type { TextVariantProps } from './cva';

export type TextProps = RNTextProps &
  TextVariantProps & {
    /** Renders in the system monospace face — for technical/code-like values (IDs, key prefixes). */
    mono?: boolean;
  };
