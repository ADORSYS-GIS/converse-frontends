import React, { useState } from 'react';

import { Meter } from '../../components/meter';
import { SPEC_ACCENT, specSeriesColor } from '../../chart-tokens';
import { LABEL_CLASS } from '../../lib/type-roles';
import { Sparkline } from './sparkline';
import type { RankedSeriesRow, RankedSeriesRowsProps } from './types';

/**
 * The ONE ranked-list primitive every usage breakdown in IA v3 phase 4 renders through — accounts,
 * projects, models, users, api keys. Replaces bespoke per-screen lists with one row shape: rank
 * swatch, label, formatted value, a share micro-bar, a sparkline, an optional `Meter`, an optional
 * delta column.
 *
 * Grounded in the phase's own measurement (726k prod usage rows): a plain share-of-total bar reads
 * as a flat grey wall the moment one row dominates (a single model handling ~all of an account's
 * traffic is the COMMON case, not the exception — "top-1 ≥95% for half of accounts"), so the micro-
 * bar is suppressed in favour of the percentage as text once the leading row crosses that
 * threshold. `ShareBar` stays for the one place a flat share genuinely reads (the estate overlay's
 * global model split) — this is the ranked/trended reading everywhere else.
 *
 * NO UPSTREAM: same reasoning as `ShareBar`/`ChartLegend` — daisy ships no ranked list, and
 * `progress` is rejected outright (PRIMITIVES.md § "not adopted").
 */
const DEFAULT_TOP_N = 8;
const DEFAULT_EMPTY_MESSAGE = 'No usage in this range.';
const TOP_SHARE_SUPPRESS_BAR_PERCENT = 95;

function defaultOtherLabel(count: number): string {
  return `Other (${count})`;
}

function defaultPercent(percent: number): string {
  if (percent === 0) return '0%';
  if (percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}

function deltaGlyph(delta: number): string {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '→';
}

interface Rendered {
  key: string;
  label: string;
  formattedValue?: string;
  percent: number;
  color: string;
  sparklinePoints?: number[];
  meter?: RankedSeriesRow['meter'];
  delta?: number;
  formattedDelta?: string;
  emphasized: boolean;
  subtle: boolean;
  /** Set only when `hrefFor` gave this row a destination — see `RankedSeriesRowsProps.hrefFor`. */
  href?: string;
}

export function RankedSeriesRows({
  rows,
  topN = DEFAULT_TOP_N,
  otherLabel = defaultOtherLabel,
  sortMode = 'value',
  selectedKey,
  onSelect,
  hrefFor,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
}: RankedSeriesRowsProps) {
  // Sanctioned local state — a disclosure toggle for the zero-value tail, never URL-worthy view
  // state (console-ui skill's `useState` exceptions list has no ranked-list disclosure entry of
  // its own, but this is the same class as "pre-submit form drafts": purely local, gone on
  // remount, never something a colleague needs a shareable link to).
  const [zeroTailExpanded, setZeroTailExpanded] = useState(false);

  if (rows.length === 0) {
    return (
      <div className={className}>
        <p className={LABEL_CLASS}>{emptyMessage}</p>
      </div>
    );
  }

  const total = rows.reduce((sum, row) => sum + Math.max(row.value, 0), 0);

  // Rank (and therefore colour and Top-N/Other membership) is always a VALUE concept — see
  // `RankedSeriesRowsProps.sortMode`'s own doc comment.
  const byValue = [...rows].sort((a, b) => b.value - a.value);
  const withSpend = byValue.filter((row) => row.value !== 0);
  const noSpend = byValue.filter((row) => row.value === 0);

  const visibleByValue = withSpend.slice(0, topN);
  const overflow = withSpend.slice(topN);

  const topShare = total > 0 ? ((visibleByValue[0]?.value ?? 0) / total) * 100 : 0;
  const suppressBars = topShare >= TOP_SHARE_SUPPRESS_BAR_PERCENT;

  const visible: Rendered[] = visibleByValue.map((row, index) => ({
    key: row.key,
    label: row.label,
    formattedValue: row.formattedValue,
    percent: total > 0 ? (Math.max(row.value, 0) / total) * 100 : 0,
    color: row.key === selectedKey || row.breached ? SPEC_ACCENT : specSeriesColor(index),
    sparklinePoints: row.sparklinePoints,
    meter: row.meter,
    delta: row.delta,
    formattedDelta: row.formattedDelta,
    emphasized: row.key === selectedKey || Boolean(row.breached),
    subtle: Boolean(row.subtle) && row.key !== selectedKey && !row.breached,
    href: hrefFor?.(row),
  }));

  // The reading order only — bucket membership (which rows are "visible" at all) was already
  // decided above, by value.
  if (sortMode === 'delta') {
    visible.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  }

  const other: Rendered | null =
    overflow.length > 0
      ? {
          key: '__other__',
          label: otherLabel(overflow.length),
          formattedValue: undefined,
          percent:
            total > 0
              ? (overflow.reduce((sum, row) => sum + Math.max(row.value, 0), 0) / total) * 100
              : 0,
          color: specSeriesColor(3), // always rank-4 grey, regardless of overflow size
          emphasized: false,
          subtle: false,
        }
      : null;

  return (
    <div className={className}>
      <ul className="ranked-series-rows">
        {visible.map((row) => {
          // Identical cell content either way — a linked row and a selectable row are the SAME
          // row, only reached differently (see `RankedSeriesRowsProps.hrefFor`). Extracted rather
          // than duplicated so the two can never drift into two different rows.
          const cells = (
            <>
              <span
                aria-hidden="true"
                className="series-swatch"
                style={{ backgroundColor: row.color }}
              />
              <span className="ranked-label">{row.label}</span>
              {row.sparklinePoints && row.sparklinePoints.length > 0 ? (
                <Sparkline points={row.sparklinePoints} color={row.color} />
              ) : (
                <span aria-hidden="true" />
              )}
              {suppressBars ? (
                <span className="ranked-percent">{defaultPercent(row.percent)}</span>
              ) : (
                <span className="ranked-share-bar" style={{ color: row.color }} aria-hidden="true">
                  <span style={{ width: `${Math.max(row.percent, row.percent > 0 ? 2 : 0)}%` }} />
                </span>
              )}
              <span className="ranked-value">{row.formattedValue}</span>
              {row.delta !== undefined ? (
                <span className="ranked-delta">
                  {deltaGlyph(row.delta)} {row.formattedDelta}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
            </>
          );

          return (
            <li key={row.key}>
              {row.href ? (
                <a
                  href={row.href}
                  data-emphasized={row.emphasized ? 'true' : 'false'}
                  data-subtle={row.subtle ? 'true' : 'false'}
                  className="ranked-row">
                  {cells}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={
                    onSelect ? () => onSelect(row.key === selectedKey ? null : row.key) : undefined
                  }
                  disabled={!onSelect}
                  aria-pressed={onSelect ? row.key === selectedKey : undefined}
                  data-emphasized={row.emphasized ? 'true' : 'false'}
                  data-subtle={row.subtle ? 'true' : 'false'}
                  className="ranked-row">
                  {cells}
                </button>
              )}
              {row.meter ? (
                <Meter
                  className="mt-1"
                  value={row.meter.value}
                  ceiling={row.meter.ceiling}
                  threshold={row.meter.threshold}
                  showCaption={false}
                  label={`${row.label} draw`}
                />
              ) : null}
            </li>
          );
        })}

        {other ? (
          <li>
            <button
              type="button"
              disabled
              data-emphasized="false"
              data-subtle="true"
              className="ranked-row">
              <span
                aria-hidden="true"
                className="series-swatch"
                style={{ backgroundColor: other.color }}
              />
              <span className="ranked-label">{other.label}</span>
              <span aria-hidden="true" />
              {suppressBars ? (
                <span className="ranked-percent">{defaultPercent(other.percent)}</span>
              ) : (
                <span
                  className="ranked-share-bar"
                  style={{ color: other.color }}
                  aria-hidden="true">
                  <span
                    style={{ width: `${Math.max(other.percent, other.percent > 0 ? 2 : 0)}%` }}
                  />
                </span>
              )}
              {/* No value column — the spec's own example ("Other (77 accounts)") states the
                  count, not a summed figure; the share micro-bar/percent already carries the
                  magnitude and a synthesized total would need its own formatting convention this
                  primitive has no way to know (see `RankedSeriesRowsProps`). */}
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </li>
        ) : null}

        {noSpend.length > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => setZeroTailExpanded((expanded) => !expanded)}
              aria-expanded={zeroTailExpanded}
              data-emphasized="false"
              data-subtle="true"
              className="ranked-row">
              <span
                aria-hidden="true"
                className="series-swatch"
                style={{ backgroundColor: 'transparent' }}
              />
              <span className="ranked-label">{noSpend.length} more · no spend this period</span>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            {zeroTailExpanded ? (
              <ul className="ranked-series-rows mt-1">
                {noSpend.map((row) => (
                  <li key={row.key}>
                    <div data-emphasized="false" data-subtle="true" className="ranked-row">
                      <span
                        aria-hidden="true"
                        className="series-swatch"
                        style={{ backgroundColor: 'transparent' }}
                      />
                      <span className="ranked-label">{row.label}</span>
                      <span aria-hidden="true" />
                      <span aria-hidden="true" />
                      <span className="ranked-value">{row.formattedValue}</span>
                      <span aria-hidden="true" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
