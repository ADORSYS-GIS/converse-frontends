import React from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { KeyValue } from '../key-value';
import { Stack } from '../stack';
import { Text } from '../text';
import { dataCardVariants } from './cva';
import type { DataCardProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;

function renderHeading(value: React.ReactNode) {
  return typeof value === 'string' ? (
    <Text intent="bodyStrong" numberOfLines={1}>
      {value}
    </Text>
  ) : (
    value
  );
}

function renderSubheading(value: React.ReactNode) {
  return typeof value === 'string' ? (
    <Text intent="caption" numberOfLines={1}>
      {value}
    </Text>
  ) : (
    value
  );
}

/**
 * Card presenting one record — an API key, a project, a member — as a
 * header (leading icon/avatar, title/subtitle, status badge, trailing
 * action) plus an optional wrapping grid of metadata pairs. For a compact
 * row inside a list use ListRow instead; DataCard is the card-sized version
 * for grids and detail summaries.
 */
export function DataCard({
  title,
  subtitle,
  leading,
  status,
  trailing,
  items,
  footer,
  tone,
  onPress,
  ...props
}: DataCardProps) {
  const className = cn(dataCardVariants({ tone }));

  const content = (
    <Stack gap="md">
      <Stack direction="row" align="start" justify="between" gap="sm" width="full">
        <Stack direction="row" align="start" gap="sm" style={{ flex: 1 }}>
          {leading}
          <Stack gap="xs" style={{ flex: 1 }}>
            {renderHeading(title)}
            {subtitle ? renderSubheading(subtitle) : null}
          </Stack>
        </Stack>
        {status}
        {trailing}
      </Stack>
      {items && items.length > 0 ? (
        <Stack direction="row" wrap="wrap" gap="md">
          {items.map((item) => (
            <View key={item.label} style={{ minWidth: 140, flexGrow: 1 }}>
              <KeyValue label={item.label} value={item.value} layout="stacked" />
            </View>
          ))}
        </Stack>
      ) : null}
      {footer}
    </Stack>
  );

  if (onPress) {
    return (
      <PressableBase
        accessibilityRole="button"
        className={className}
        onPress={onPress}
        {...(props as PressableProps)}>
        {content}
      </PressableBase>
    );
  }

  return (
    <ViewBase className={className} {...(props as ViewProps)}>
      {content}
    </ViewBase>
  );
}
