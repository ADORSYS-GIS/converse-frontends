import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { skeletonVariants } from './cva';
import type { SkeletonProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const AnimatedView = Animated.createAnimatedComponent(ViewBase);

const PULSE_DURATION_MS = 900;

/**
 * Shimmer placeholder for content that's still loading. Pulses opacity rather than sweeping a
 * gradient — cheaper, no extra dependency, and reads fine at the sizes this app uses it at.
 */
export function Skeleton({
  rounded,
  width = '100%',
  height = 14,
  style,
  ...props
}: Readonly<SkeletonProps>) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <AnimatedView
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(skeletonVariants({ rounded }))}
      style={[{ width, height, opacity }, style]}
      {...props}
    />
  );
}
