import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { Text as UiText } from '../text';
import { sectionCardVariants, sectionTitleVariants } from './cva';
import type { SectionCardProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

export function SectionCard({
  title,
  description,
  action,
  tone,
  children,
  ...props
}: SectionCardProps) {
  return (
    <ViewBase className={cn(sectionCardVariants({ tone }))} {...props}>
      <Stack gap="md">
        <Stack direction="row" align="start" justify="between" gap="sm" width="full">
          <Stack gap="xs" style={{ flex: 1 }}>
            <TextBase className={cn(sectionTitleVariants({ tone }))}>{title}</TextBase>
            {description ? <UiText intent="caption">{description}</UiText> : null}
          </Stack>
          {action}
        </Stack>
        {children}
      </Stack>
    </ViewBase>
  );
}
