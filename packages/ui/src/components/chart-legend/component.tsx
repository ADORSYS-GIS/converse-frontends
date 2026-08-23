import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PressableProps, TextProps, ViewProps } from 'react-native';
import { Line, Svg } from 'react-native-svg';

import { cn } from '../../cn';
import { CHART_ACCENT, CHART_TEXT_PRIMARY, seriesColor, seriesDash } from '../chart-core/colors';
import type { ChartLegendProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const PressableBase = Pressable as React.ComponentType<PressableProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

/**
 * Legend for any of the chart primitives -- a swatch (a short dashed line
 * snippet, matching the mark it labels, not just a colour dot: the ramp is
 * monochrome, so the dash pattern is the identity channel a plain colour swatch
 * would drop) plus a label, one row per series.
 *
 * Per the dataviz skill's marks-and-anatomy rule, a legend is the dependable
 * identity channel for 2+ series and unnecessary noise for exactly one (the
 * chart's own title already says what's plotted) -- enforced here, not left to
 * every caller to remember.
 *
 * Colours are hardcoded against the ADR-0008 `#000` chart floor (see
 * `chart-core/colors.ts`), not the app's `intent`/`tone` theme tokens, which
 * don't yet carry chart-specific values (ADR-0008 Follow-up 9).
 */
export function ChartLegend({ items, selectedKey, onSelectKey }: ChartLegendProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <ViewBase className="flex-row flex-wrap items-center" style={{ gap: 4 }}>
      {items.map((item, index) => {
        const selected = item.key === selectedKey;
        const color = seriesColor(index, { selected, breached: item.breached });
        const dash = seriesDash(index);
        const handlePress = onSelectKey ? () => onSelectKey(selected ? null : item.key) : undefined;

        return (
          <PressableBase
            key={item.key}
            onPress={handlePress}
            disabled={!onSelectKey}
            accessibilityRole={onSelectKey ? 'button' : undefined}
            accessibilityState={onSelectKey ? { selected } : undefined}
            accessibilityLabel={item.breached ? `${item.label}, over ceiling` : item.label}
            className={cn('flex-row items-center px-1')}
            style={{ minHeight: 44, gap: 8 }}>
            <Svg width={20} height={12}>
              <Line
                x1={0}
                y1={6}
                x2={20}
                y2={6}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={dash || undefined}
              />
            </Svg>
            <TextBase
              style={{
                color: selected || item.breached ? CHART_ACCENT : CHART_TEXT_PRIMARY,
                fontSize: 13,
              }}>
              {item.label}
            </TextBase>
          </PressableBase>
        );
      })}
    </ViewBase>
  );
}
