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
          paddingVertical: designTokens.spacing.topBarVertical,
        },
        style,
      ]}
      {...props}>
      {/* Bar spans full width; its content is centered to the same column as the
          page body so the title aligns with the content below on wide screens. */}
      <ViewBase
        style={{
          width: '100%',
          maxWidth: designTokens.layout.maxContentWidth,
          marginHorizontal: 'auto',
          paddingHorizontal: designTokens.spacing.topBarHorizontal,
        }}>
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
    </ViewBase>
  );
}
