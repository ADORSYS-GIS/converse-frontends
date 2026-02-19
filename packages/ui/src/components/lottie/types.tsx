import type { ViewProps } from 'react-native';
import type { LottieViewProps } from 'lottie-react-native';

import type { LottieVariantProps } from './cva';

export type LottieSource = number | { uri: string } | object;

export type LottieProps = Omit<LottieViewProps, 'source'> &
  LottieVariantProps & {
    source: LottieSource;
    containerProps?: ViewProps;
  };
