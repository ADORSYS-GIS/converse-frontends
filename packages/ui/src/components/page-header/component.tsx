import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { designTokens } from '../../design/tokens';
import { Stack } from '../stack';
import { Text } from '../text';
import { pageHeaderVariants } from './cva';
import type { PageHeaderProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function PageHeader({
  title,
  subtitle,
  leading,
  trailing,
  border,
  style,
  ...props
}: PageHeaderProps) {
  return (
    <ViewBase
      className={cn(pageHeaderVariants({ border }))}
      style={[
        {
          minHeight: designTokens.layout.topBarMinHeight,
          paddingHorizontal: designTokens.spacing.topBarHorizontal,
          paddingVertical: designTokens.spacing.topBarVertical,
        },
        style,
      ]}
      {...props}>
      <Stack direction="row" align="center" gap="sm" width="full">
        {leading}
        <Stack style={{ flex: 1 }}>
          <Text
            intent="bodyStrong"
            numberOfLines={1}
            style={{ fontSize: designTokens.typography.compactTitle }}>
            {title}
          </Text>
          {subtitle ? (
            <Text intent="caption" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        {trailing}
      </Stack>
    </ViewBase>
  );
}
