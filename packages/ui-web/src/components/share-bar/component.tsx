import React from 'react';

import { cn } from '../../cn';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ShareBarProps, ShareBarSegment } from './types';

// Replaces `DonutChart` (owner review 2026-08-29). A donut spent ~330px of height to say what its
// own legend already said in words; adjacent grey arcs are the worst case for a monochrome
// rank ramp, and at 99/1/0.4 the minor slices were invisible slivers. Length beats angle for
// comparing magnitudes. See docs/design/console-redesign/README.md §2.4a.
//
// NO UPSTREAM, by construction: this primitive originates in the DOM build and daisy ships no
// share bar, no ranked series list and (per PRIMITIVES.md § "not adopted") no `progress` we are
// allowed to use — its rounded, animated track is the opposite of the console's square 4px one.
//
// The row it renders IS `ChartLegend`'s row (swatch, name, value), so both take `series-row` /
// `series-swatch` and the `data-emphasized` ramp from `theme.css` rather than each restating the
// same four colour ternaries. Only the track and the percent column are this component's own.

const MIN_VISIBLE_PERCENT = 0.6;

const DEFAULT_EMPTY_MESSAGE = 'No spend in this range.';

function defaultFormatPercent(percent: number): string {
  if (percent === 0) return '0%';
  if (percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

type Computed = ShareBarSegment & { percent: number; color: string; index: number };

export function ShareBar({
  segments,
  selectedKey,
  onSelectSegment,
  formatPercent = defaultFormatPercent,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
}: ShareBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  const computed: Computed[] = segments.map((segment, index) => {
    const emphasized = segment.key === selectedKey || Boolean(segment.breached);
    return {
      ...segment,
      index,
      percent: total > 0 ? (Math.max(segment.value, 0) / total) * 100 : 0,
      color: emphasized ? SPEC_ACCENT : specSeriesColor(index),
    };
  });

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* The bar is a PICTURE of the list below it, so it is `aria-hidden` and carries no tab
          stops: every segment's identity, value and share is already in the list as real text,
          and the list rows are the interactive control when `onSelectSegment` is set. Making
          both interactive would double every series in the accessibility tree — the same
          reasoning `ChartLegend` applies when it suppresses itself for a single series. */}
      <div aria-hidden="true" className="share-track">
        {computed.map((segment) => (
          <span
            key={segment.key}
            // `minWidth` keeps a real-but-tiny share visible instead of collapsing to nothing —
            // the exact failure the donut had at 0.4%. Flex-basis carries the true proportion.
            style={{
              flexBasis: `${segment.percent}%`,
              minWidth: segment.percent > 0 ? `${MIN_VISIBLE_PERCENT}%` : 0,
              backgroundColor: segment.color,
            }}
          />
        ))}
        {/* Nothing to show is still a bar, at the empty tone — not a collapsed zero-height gap. */}
        {total === 0 ? <span className="bg-raised flex-1" /> : null}
      </div>

      {computed.length === 0 ? <p className={LABEL_CLASS}>{emptyMessage}</p> : null}

      <ul className="flex flex-col">
        {computed.map((segment) => {
          const selected = segment.key === selectedKey;
          const emphasized = selected || Boolean(segment.breached);
          const handleClick = onSelectSegment
            ? () => onSelectSegment(selected ? null : segment.key)
            : undefined;

          return (
            <li key={segment.key}>
              <button
                type="button"
                onClick={handleClick}
                disabled={!onSelectSegment}
                aria-pressed={onSelectSegment ? selected : undefined}
                aria-label={segment.breached ? `${segment.label}, over ceiling` : undefined}
                data-emphasized={emphasized ? 'true' : 'false'}
                // A non-selectable ShareBar is still rendered as buttons (one markup, one set of
                // tests) and marked `disabled`; `series-row` reads that for the cursor and the
                // hover fill, so there is no affordance decision left at this call site. The row
                // fills its column here (it does not in the wrapping legend) and its gap is one
                // step wider, which is the whole of the difference between the two.
                className="series-row w-full gap-3">
                <span
                  aria-hidden="true"
                  className="series-swatch"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="series-label">{segment.label}</span>
                {segment.formattedValue ? (
                  <span className="series-value">{segment.formattedValue}</span>
                ) : null}
                <span className="series-percent">{formatPercent(segment.percent)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
