import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { cn } from '../../cn';
import { AppFont } from '../../hooks/use-app-fonts';
import { headingVariants } from './cva';
import type { HeadingProps } from './types';

const TextBase = RNText as React.ComponentType<RNTextProps & { className?: string }>;

const fontByTone: Record<NonNullable<HeadingProps['tone']>, AppFont> = {
  title: AppFont.BakbakOne,
  subtitle: AppFont.MontserratRegular,
};

export function Heading({ tone = 'title', align, style, ...props }: HeadingProps) {
  const fontFamily = fontByTone[tone!];

  return (
    <TextBase
      {...props}
      className={cn(headingVariants({ tone, align }))}
      style={[{ fontFamily }, style]}
    />
  );
}
