import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { skeletonVariants } from './cva';
import type { SkeletonProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

/**
 * Shimmer placeholder for content that's still loading. Pulses opacity rather than sweeping a
 * gradient — cheaper, no extra dependency, and reads fine at the sizes this app uses it at.
 *
 * The pulse comes from NativeWind's `animate-pulse` (a CSS animation on web, translated to
 * Reanimated on native), not a hand-wired RN `Animated.Value`. Same precedent as Spinner, and
 * for the same reason: `Animated.createAnimatedComponent()` produces a component NativeWind
 * doesn't know about, so every `className` on it is dropped and the element renders with no
 * background, no rounding, and no pulse.
 */
export function Skeleton({
  rounded,
  width = '100%',
  height = 14,
  style,
  ...props
}: Readonly<SkeletonProps>) {
  return (
    <ViewBase
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('animate-pulse', skeletonVariants({ rounded }))}
      style={[{ width, height }, style]}
      {...props}
    />
  );
}
