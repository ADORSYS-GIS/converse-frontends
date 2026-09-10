import React from 'react';

import { cn } from '../../cn';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import { SeriesRow } from '../../lib/series-row';
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
// The row it renders IS `ChartLegend`'s row, so both now render `lib/series-row.tsx` rather than
// each restating the same five elements and the same colour ternaries. The two ways a share
// bar's rows differ from a legend's — full width, one gap step wider — are stated contextually in
// `theme.css`'s `share-bar` block, so nothing about that difference is passed in from here. Only
// the track is this component's own.

const MIN_VISIBLE_PERCENT = 0.6;

/** The collapsed tail's key, folded in by the caller (`collapseSegmentsTail`). Never linked: it is
 *  several entities at once, and there is no page for "several". */
const OTHER_KEY = '__other__';

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
  hrefFor,
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
    <div className={cn('share-bar', className)}>
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
        {/* Nothing to show is still a bar, at the empty tone — not a collapsed zero-height gap.
            The fill itself is a rule inside the track's own block. */}
        {total === 0 ? <span className="share-track-empty" /> : null}
      </div>

      {computed.length === 0 ? <p className={LABEL_CLASS}>{emptyMessage}</p> : null}

      <ul>
        {computed.map((segment) => {
          const selected = segment.key === selectedKey;
          const href = segment.key === OTHER_KEY ? undefined : hrefFor?.(segment);
          return (
            <li key={segment.key}>
              <SeriesRow
                color={segment.color}
                label={segment.label}
                value={segment.formattedValue}
                percent={formatPercent(segment.percent)}
                emphasized={selected || Boolean(segment.breached)}
                pressed={selected}
                href={href}
                // Only a breach overrides the name. A plain row's text already reads
                // "name, value, share" and naming it would throw the numbers away.
                ariaLabel={segment.breached ? `${segment.label}, over ceiling` : undefined}
                onSelect={
                  onSelectSegment ? () => onSelectSegment(selected ? null : segment.key) : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
