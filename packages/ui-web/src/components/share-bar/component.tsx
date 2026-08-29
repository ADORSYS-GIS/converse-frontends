import React from 'react';

import { cn } from '../../cn';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import { LABEL_CLASS, ROW_CLASS } from '../../lib/type-roles';
import type { ShareBarProps, ShareBarSegment } from './types';

// Replaces `DonutChart` (owner review 2026-08-29). A donut spent ~330px of height to say what its
// own legend already said in words; adjacent grey arcs are the worst case for a monochrome
// rank ramp, and at 99/1/0.4 the minor slices were invisible slivers. Length beats angle for
// comparing magnitudes. See docs/design/console-redesign/README.md §2.4a.
//
// NO UPSTREAM, by construction: this primitive originates in the DOM build and daisy ships no
// share bar, no ranked series list and (per PRIMITIVES.md § "not adopted") no `progress` we are
// allowed to use — its rounded, animated track is the opposite of the console's square 4px one.
// So the utilities below are the component, not decoration on top of one. What they are NOT is
// repeated: every treatment used more than once is a constant here, and both type roles come from
// lib/type-roles.ts.

const MIN_VISIBLE_PERCENT = 0.6;

const DEFAULT_EMPTY_MESSAGE = 'No spend in this range.';

// The bar: an 8px track whose segments are separated by a hairline gap, clipped to the console's
// 2px radius.
const BAR_CLASS = 'flex h-2 w-full gap-px overflow-hidden rounded-[2px]';

// A list row. 28px is the minimum comfortable hit target for a rail-width list; `px-1` keeps the
// hover fill from cropping the swatch.
const ROW_BUTTON_CLASS = `${ROW_CLASS} flex min-h-[28px] w-full items-center gap-3 rounded-[2px] px-1`;

// The 10x2 rank swatch — a 2px rule, matching the chart legend's, never a dot or a pill.
const SWATCH_CLASS = 'h-[2px] w-[10px] shrink-0';

// Numeric columns never reflow when a value gets wider, and never wrap.
const NUMERIC_CLASS = 'shrink-0 tabular-nums';

// Emphasis is a step up the grey ramp, never a colour: the selected or breached series reads
// stronger than its neighbours without introducing a second accent (ADR 0008).
const emphasis = (on: boolean, [off, up]: readonly [string, string]) => (on ? up : off);
const LABEL_EMPHASIS = ['text-soft', 'text-ink'] as const;
const VALUE_EMPHASIS = ['text-subtle', 'text-soft'] as const;

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
      <div aria-hidden="true" className={BAR_CLASS}>
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
                // A non-selectable ShareBar is still rendered as buttons (one markup, one set of
                // tests) but must not offer a hover fill or a pointer it cannot honour.
                className={cn(
                  ROW_BUTTON_CLASS,
                  onSelectSegment ? 'hover:bg-chrome cursor-pointer' : 'cursor-default'
                )}>
                <span
                  aria-hidden="true"
                  className={SWATCH_CLASS}
                  style={{ backgroundColor: segment.color }}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-left',
                    emphasis(emphasized, LABEL_EMPHASIS)
                  )}>
                  {segment.label}
                </span>
                {segment.formattedValue ? (
                  <span className={cn(NUMERIC_CLASS, emphasis(emphasized, VALUE_EMPHASIS))}>
                    {segment.formattedValue}
                  </span>
                ) : null}
                {/* Fixed track so the percent column aligns down the list regardless of value
                    width — numerics are right-aligned (console-ui skill "Type"). */}
                <span
                  className={cn(
                    NUMERIC_CLASS,
                    'w-10 text-right',
                    emphasis(emphasized, VALUE_EMPHASIS)
                  )}>
                  {formatPercent(segment.percent)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
