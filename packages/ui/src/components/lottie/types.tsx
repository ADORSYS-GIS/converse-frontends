import type { ViewProps } from 'react-native';
import type { AnimationObject, LottieViewProps } from 'lottie-react-native';

import type { LottieVariantProps } from './cva';

export type LottieSource = number | string | AnimationObject | { uri: string };

export type LottieProps = Omit<LottieViewProps, 'source'> &
  LottieVariantProps & {
    source: LottieSource;
    containerProps?: ViewProps;
  };
