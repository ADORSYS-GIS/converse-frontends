import React from 'react';
import { Image as ExpoImage } from 'expo-image';
import type { ImageProps as ExpoImageProps } from 'expo-image';

import { cn } from '../../cn';
import { imageVariants } from './cva';
import type { ImageProps } from './types';

const DEFAULT_BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

const ImageBase = ExpoImage as React.ComponentType<ExpoImageProps & { className?: string }>;

export function Image({ radius, placeholder, transition = 120, ...props }: ImageProps) {
  const resolvedPlaceholder = placeholder === undefined ? DEFAULT_BLURHASH : placeholder;

  return (
    <ImageBase
      placeholder={resolvedPlaceholder}
      transition={transition}
      className={cn(imageVariants({ radius }))}
      {...props}
    />
  );
}
