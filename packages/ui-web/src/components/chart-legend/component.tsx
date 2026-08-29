import React from 'react';

import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import { SeriesRow } from '../../lib/series-row';
import type { ChartLegendProps } from './types';

/**
 * Legend for any of the chart primitives -- a swatch (10×2 rect, per the
 * console-redesign spec's `ChartLegend` contract) + name + value, one row per
 * series.
 *
 * Per the dataviz skill's marks-and-anatomy rule (carried over from the RN
 * source), a legend is the dependable identity channel for 2+ series and
 * unnecessary noise for exactly one (the chart's own title already says what's
 * plotted) -- enforced here, not left to every caller to remember. That rule is
 * the whole of this component: everything below it is the shared series row.
 *
 * DOM port of packages/ui's `chart-legend`. Two deliberate contract
 * changes from the RN source, both spec-driven (§4 component inventory):
 *   - the swatch is a plain 10×2 rect (`specSeriesColor`), not a dashed line
 *     snippet -- the spec names the exact swatch geometry.
 *   - each item now carries an optional `value`, rendered after the label
 *     (`overview.svg`'s spend legend shows `gpt-4o-mini  $61.20`).
 * The selected/breached entry is `ink` label + `primary` swatch (task brief);
 * its value renders `soft`. A default entry is `soft` label + `subtle` value.
 *
 * That whole ramp, the row markup and the swatch live in `lib/series-row.tsx`
 * and the block it paints from, shared with `ShareBar` -- which renders the same
 * row and used to restate the same four colour ternaries independently.
 */
export function ChartLegend({ items, selectedKey, onSelectKey }: ChartLegendProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <div className="series-legend">
      {items.map((item, index) => {
        const selected = item.key === selectedKey;
        const emphasized = selected || Boolean(item.breached);
        return (
          <SeriesRow
            key={item.key}
            color={emphasized ? SPEC_ACCENT : specSeriesColor(index)}
            label={item.label}
            value={item.value}
            emphasized={emphasized}
            pressed={selected}
            // A legend row's text is a bare label, so it names itself -- except when breached,
            // where the name has to carry the fact the swatch colour is showing.
            ariaLabel={item.breached ? `${item.label}, over ceiling` : item.label}
            onSelect={onSelectKey ? () => onSelectKey(selected ? null : item.key) : undefined}
          />
        );
      })}
    </div>
  );
}
