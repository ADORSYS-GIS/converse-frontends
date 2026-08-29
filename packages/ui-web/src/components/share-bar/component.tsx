import React from 'react';

import { cn } from '../../cn';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import type { ShareBarProps, ShareBarSegment } from './types';

// Contract: replaces `DonutChart` as the console's part-to-whole mark (owner review 2026-08-29).
//
// A donut spends two dimensions to encode one. On Overview it stood 330px tall — more vertical
// space than the time-series chart above it — to say "one project is 99% of spend", which the
// three-row legend beneath it already said in words. Worse, the console's ramp is monochrome by
// design (console-ui skill "Charts": greys by series rank, orange at most once), and adjacent
// grey arcs in a ring are the hardest possible case for that ramp — at 99/1/0 the two minor
// slices were sub-pixel slivers indistinguishable from each other and from the ring itself.
//
// A 100%-stacked bar encodes the same single dimension along the axis people already read
// left-to-right, in ~8px instead of ~330, and degrades gracefully: a 0.4% segment is still a
// visible sliver at the right end rather than an invisible arc, and the rank list below it is
// the accessible, sortable, scannable representation the donut's scattered radial legend never
// was.
//
// Angular position is also, per the dataviz literature this repo's chart work already follows,
// a materially worse channel than length for comparing magnitudes — the reason this is the
// second-to-last chart type anyone should reach for and the first one to cut.

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
      <div aria-hidden="true" className="flex h-2 w-full gap-px overflow-hidden rounded-[2px]">
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
        {total === 0 ? <span className="bg-raised flex-1" /> : null}
      </div>

      {computed.length === 0 ? (
        <p className="text-subtle font-mono text-[11px]">{emptyMessage}</p>
      ) : null}

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
                className={cn(
                  'flex min-h-[28px] w-full items-center gap-3 rounded-[2px] px-1 font-mono text-xs',
                  onSelectSegment ? 'hover:bg-chrome cursor-pointer' : 'cursor-default',
                  'disabled:cursor-default'
                )}>
                <span
                  aria-hidden="true"
                  className="h-[2px] w-[10px] shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-left',
                    emphasized ? 'text-ink' : 'text-soft'
                  )}>
                  {segment.label}
                </span>
                {segment.formattedValue ? (
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      emphasized ? 'text-soft' : 'text-subtle'
                    )}>
                    {segment.formattedValue}
                  </span>
                ) : null}
                {/* Fixed track so the percent column aligns down the list regardless of value
                    width — numerics are right-aligned (console-ui skill "Type"). */}
                <span
                  className={cn(
                    'w-10 shrink-0 text-right tabular-nums',
                    emphasized ? 'text-soft' : 'text-subtle'
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
