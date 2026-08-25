import React from 'react';

import { cn } from '../../cn';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import type { ChartLegendProps } from './types';

/**
 * Legend for any of the chart primitives -- a swatch (10×2 rect, per the
 * console-redesign spec's `ChartLegend` contract) + name + value, one row per
 * series.
 *
 * Per the dataviz skill's marks-and-anatomy rule (carried over from the RN
 * source), a legend is the dependable identity channel for 2+ series and
 * unnecessary noise for exactly one (the chart's own title already says what's
 * plotted) -- enforced here, not left to every caller to remember.
 *
 * DOM port of packages/ui's `chart-legend`. Two deliberate contract
 * changes from the RN source, both spec-driven (§4 component inventory):
 *   - the swatch is a plain 10×2 rect (`specSeriesColor`), not a dashed line
 *     snippet -- the spec names the exact swatch geometry.
 *   - each item now carries an optional `value`, rendered after the label
 *     (`overview.svg`'s spend legend shows `gpt-4o-mini  $61.20`).
 * The selected/breached entry is `ink` label + `primary` swatch (task brief);
 * its value renders `soft`. A default entry is `soft` label + `subtle` value.
 */
export function ChartLegend({ items, selectedKey, onSelectKey }: ChartLegendProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 font-mono">
      {items.map((item, index) => {
        const selected = item.key === selectedKey;
        const emphasized = selected || Boolean(item.breached);
        const color = emphasized ? SPEC_ACCENT : specSeriesColor(index);
        const handleClick = onSelectKey ? () => onSelectKey(selected ? null : item.key) : undefined;

        return (
          <button
            key={item.key}
            type="button"
            onClick={handleClick}
            disabled={!onSelectKey}
            aria-pressed={onSelectKey ? selected : undefined}
            aria-label={item.breached ? `${item.label}, over ceiling` : item.label}
            className={cn(
              'flex min-h-[28px] items-center gap-2 rounded-[2px] px-1',
              onSelectKey ? 'cursor-pointer hover:bg-chrome' : 'cursor-default',
              'disabled:cursor-default',
            )}>
            <span
              aria-hidden="true"
              className="h-[2px] w-[10px] shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className={cn('text-xs', emphasized ? 'text-ink' : 'text-soft')}>
              {item.label}
            </span>
            {item.value ? (
              <span className={cn('text-xs tabular-nums', emphasized ? 'text-soft' : 'text-subtle')}>
                {item.value}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
