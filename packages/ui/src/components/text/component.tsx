import React from 'react';
import { Platform, Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { cn } from '../../cn';
import { textVariants } from './cva';
import type { TextProps } from './types';

const TextBase = RNText as React.ComponentType<RNTextProps & { className?: string }>;

// System monospace — no font asset to bundle/license, and every platform ships one.
const monoFontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

export function Text({ intent, align, mono, style, ...props }: TextProps) {
  return (
    <TextBase
      className={cn(textVariants({ intent, align }))}
      style={mono ? [{ fontFamily: monoFontFamily }, style] : style}
      {...props}
    />
  );
}
