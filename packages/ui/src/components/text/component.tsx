import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { cn } from '../../cn';
import { textVariants } from './cva';
import type { TextProps } from './types';

const TextBase = RNText as React.ComponentType<RNTextProps & { className?: string }>;

export function Text({ intent, align, ...props }: TextProps) {
  return <TextBase className={cn(textVariants({ intent, align }))} {...props} />;
}
