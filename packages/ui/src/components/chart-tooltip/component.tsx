import React from 'react';
import { Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { CHART_TEXT_MUTED, CHART_TEXT_PRIMARY } from '../chart-core/colors';
import type { ChartTooltipProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;
const TextBase = Text as React.ComponentType<TextProps & { className?: string }>;

const DEFAULT_WIDTH = 168;

/**
 * Presentational tooltip card, absolutely positioned over a chart at a data
 * point. Purely presentational by design: which point is "active" is each
 * chart primitive's own state (driven by a tap on that primitive's marks, not
 * hover -- this is an iPad-shaped, finger-driven app, so hover-only tooltips
 * are unusable here), passed down as `x`/`y`/`rows`.
 *
 * Renders in a `<View style={{ position: 'absolute' }}>` sibling to the
 * chart's `<Svg>`, inside the same relatively-positioned wrapper -- RN/RNW text
 * layout (wrapping, measuring) is far simpler outside SVG than an SVG
 * `<ForeignObject>` would be, and this still composes fine visually since both
 * sit in the same wrapper.
 */
export function ChartTooltip({
  visible,
  x,
  y,
  title,
  rows,
  containerWidth,
  width = DEFAULT_WIDTH,
}: ChartTooltipProps) {
  if (!visible || rows.length === 0) {
    return null;
  }

  let left = x - width / 2;
  if (containerWidth !== undefined) {
    left = Math.min(Math.max(left, 4), Math.max(containerWidth - width - 4, 4));
  }

  // Estimated card height so the card sits above the anchor point without
  // needing an onLayout measure-then-reposition round trip (which would flash
  // the tooltip at the wrong spot for a frame on every open). Padding (16) +
  // an optional title row (16) + one row per data row (18) is close enough
  // for a compact card; a few px of slack is harmless, unlike a full-width
  // percentage transform, which React Native (native, not web) doesn't support.
  const estimatedHeight = 16 + (title ? 16 : 0) + rows.length * 18;
  const top = Math.max(y - estimatedHeight - 8, 0);

  return (
    <ViewBase
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        backgroundColor: '#191919',
        borderRadius: 2,
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 4,
      }}>
      {title ? (
        <TextBase style={{ color: CHART_TEXT_MUTED, fontSize: 11 }} numberOfLines={1}>
          {title}
        </TextBase>
      ) : null}
      {rows.map((row) => (
        <ViewBase key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {row.color ? (
            <ViewBase
              style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: row.color }}
            />
          ) : null}
          <TextBase style={{ color: CHART_TEXT_PRIMARY, fontSize: 12, flex: 1 }} numberOfLines={1}>
            {row.label}
          </TextBase>
          <TextBase
            style={{ color: CHART_TEXT_PRIMARY, fontSize: 12, fontVariant: ['tabular-nums'] }}>
            {row.value}
          </TextBase>
        </ViewBase>
      ))}
    </ViewBase>
  );
}
