import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { spinnerVariants } from './cva';
import type { SpinnerProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

/**
 * Indeterminate loading indicator — a rotating two-tone ring, driven by
 * NativeWind's `animate-spin` (a CSS animation on web, translated to
 * Reanimated on native) rather than a manually-wired RN `Animated.Value`.
 * Pairs with Skeleton (content-shaped placeholders) for the other loading
 * affordance: Spinner is for "an action is in flight" (button/inline
 * loading), Skeleton is for "content hasn't arrived yet".
 */
export function Spinner({
  size,
  tone,
  style,
  accessibilityLabel = 'Loading',
  ...props
}: Readonly<SpinnerProps>) {
  return (
    <ViewBase
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      className={cn('animate-spin', spinnerVariants({ size, tone }))}
      style={style}
      {...props}
    />
  );
}
