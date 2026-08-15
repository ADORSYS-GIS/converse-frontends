import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Image } from '../image';
import { avatarInitialsVariants, avatarVariants } from './cva';
import type { AvatarProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

/** Up to two initials from the first two words of `name` (e.g. "Ada Lovelace" -> "AL"). */
function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function Avatar({ name, src, size, style, ...props }: AvatarProps) {
  return (
    <ViewBase
      accessibilityRole="image"
      accessibilityLabel={name}
      className={cn(avatarVariants({ size }))}
      style={style}
      {...props}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <TextBase className={cn(avatarInitialsVariants({ size }))}>{initialsFrom(name)}</TextBase>
      )}
    </ViewBase>
  );
}
