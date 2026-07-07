import React from 'react';
import type { PressableProps, TextProps, ViewProps } from 'react-native';
import { Pressable, Text, View } from 'react-native';

import { cn } from '../../cn';
import {
  segmentDividerVariants,
  segmentLabelVariants,
  segmentVariants,
  segmentedControlVariants,
} from './cva';
import type { SegmentedControlProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

// ADR 0001 calls for diagonal-cut separators (not vertical hairlines) between
// tight grouped controls such as copy/rotate/revoke, period toggles, and
// settings tabs. A rotated hairline is the simplest cross-platform (RN + RN
// Web) way to render that cut without an SVG clip-path.
const DIVIDER_ROTATION = [{ rotate: '20deg' }];

export function SegmentedControl({
  options,
  value,
  onChange,
  width,
  ...props
}: Readonly<SegmentedControlProps>) {
  return (
    <ViewBase className={cn(segmentedControlVariants({ width }))} {...props}>
      {options.map((option, index) => {
        const active = option.key === value;

        return (
          <React.Fragment key={option.key}>
            {index > 0 ? (
              <ViewBase
                className={cn(segmentDividerVariants())}
                style={{ transform: DIVIDER_ROTATION }}
              />
            ) : null}
            <PressableBase
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: option.disabled }}
              accessibilityLabel={option.accessibilityLabel ?? option.label}
              disabled={option.disabled}
              className={cn(segmentVariants({ active, disabled: option.disabled }))}
              onPress={() => onChange(option.key)}>
              {option.icon}
              <TextBase className={cn(segmentLabelVariants({ active }))} numberOfLines={1}>
                {option.label}
              </TextBase>
            </PressableBase>
          </React.Fragment>
        );
      })}
    </ViewBase>
  );
}
