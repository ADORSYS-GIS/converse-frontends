import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { Text as UiText } from '../text';
import { statCardTrendVariants, statCardVariants } from './cva';
import type { StatCardProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

const TREND_GLYPH = {
  up: '↑',
  down: '↓',
  flat: '→',
} as const;

/**
 * Compact metric tile — label, headline number, optional trend delta. Built
 * from the same surface (Card-style bg-surface/shadow-sm/rounded-2xl) and
 * text tokens (`eyebrow`, `display`) already used elsewhere, so a row of
 * StatCards reads as part of the same system as SectionCard/DataCard. Does
 * not render a chart — a charting primitive is explicitly out of scope for
 * this epic (see #79); `trend` is a plain formatted delta.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  description,
  size,
  ...props
}: StatCardProps) {
  return (
    <ViewBase className={cn(statCardVariants({ size }))} {...props}>
      <Stack gap="xs">
        <Stack direction="row" align="center" justify="between" gap="sm">
          <UiText intent="eyebrow">{label}</UiText>
          {icon}
        </Stack>
        <UiText intent="display">{value}</UiText>
        {trend || description ? (
          <Stack direction="row" align="center" gap="xs">
            {trend ? (
              <TextBase className={cn(statCardTrendVariants({ direction: trend.direction }))}>
                {TREND_GLYPH[trend.direction ?? 'flat']} {trend.label}
              </TextBase>
            ) : null}
            {description ? <UiText intent="caption">{description}</UiText> : null}
          </Stack>
        ) : null}
      </Stack>
    </ViewBase>
  );
}
