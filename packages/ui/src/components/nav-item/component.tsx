import React from 'react';
import type { PressableProps, TextProps } from 'react-native';
import { Pressable, Text } from 'react-native';

import { cn } from '../../cn';
import { navItemVariants, navLabelVariants } from './cva';
import type { NavItemProps } from './types';

const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

export function NavItem({
  placement,
  active,
  label,
  icon,
  showLabel,
  labelVisible: labelVisibleProp,
  ...props
}: NavItemProps) {
  const labelVisible =
    (showLabel ?? labelVisibleProp ?? placement === 'sidebar') || Boolean(active);

  return (
    <PressableBase
      accessibilityRole="button"
      className={cn(navItemVariants({ placement, active, labelVisible }))}
      {...props}>
      {icon}
      {labelVisible ? (
        <TextBase className={cn(navLabelVariants({ placement, active }))}>{label}</TextBase>
      ) : null}
    </PressableBase>
  );
}
