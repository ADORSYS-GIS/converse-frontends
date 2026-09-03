import React, { useMemo, useState } from 'react';

import { collapseDonutTail, donutGeometry, layoutDonutArcs } from '@lightbridge/chart-core';

import { cn } from '../../cn';
import {
  SPEC_ACCENT,
  SPEC_FLOOR,
  SPEC_GRID,
  SPEC_TEXT_MUTED,
  SPEC_TEXT_PRIMARY,
  specSeriesColor,
} from '../../chart-tokens';
import { ChartTooltip } from '../chart-tooltip';
import type { ChartTooltipRow } from '../chart-tooltip';
import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { useHoverActive } from '../../lib/use-hover-active';
import type { DonutChartProps, DonutSegment } from './types';

/**
 * The RING chart (owner ruling 2026-09-02, amending ADR 0013 D5: "pie charts allowed as RINGS
 * (hollow donut), never filled disks"). It returns alongside `ShareBar` — which keeps the one
 * "how does this whole add up" job it was given on 2026-08-29 — rather than instead of it; the
 * three actor x model distribution panels are what this draws.
 *
 * Three things are deliberately different from the `DonutChart` deleted on 2026-08-29, and each
 * one is a fix for a measured reason that deletion recorded:
 *
 *  1. **It is structurally a ring.** The arc math is `chart-core`'s `donutGeometry`, whose inner
 *     radius is clamped into a sanctioned band for EVERY input — a caller cannot dial the hole to
 *     zero and get a disk back (`chart-core/arcs.test.ts` sweeps that). The hole is also what
 *     makes `centreMetric` possible, so the total is a real numeral instead of something the
 *     reader has to infer from area.
 *  2. **No legend list.** The old one composed `ChartLegend` under the ring, which spent the
 *     height it saved and restated in words what the mark already said. Per the owner's
 *     2026-08-31 ruling ("NO static per-series legend lists under any chart") values live on
 *     hover, in the shared Floating-UI `ChartTooltip`, and nowhere else.
 *  3. **A Top-N + `Other (N)` collapse**, the same one `RankedSeriesRows` applies. Adjacent greys
 *     are the worst case for a monochrome rank ramp, and twenty wedges is twenty of them; the
 *     collapse is in the primitive rather than left to each caller so it cannot be forgotten.
 *
 * Colour follows ADR 0008 Decision 6 unchanged: a monochrome rank ramp via `specSeriesColor`,
 * with the accent reserved for the SELECTED segment (or a breached one) — never decoration, and
 * never more than one accent wedge, which this component enforces itself rather than trusting
 * the caller's data.
 *
 * NO UPSTREAM: same as every sibling chart — an `<svg>` mark, nothing for daisy or Base UI to own
 * (`scripts/base-ui-adoption.ts` records the `null`). All paint is `theme.css`'s `donut-chart`
 * block; the two colours that must be SVG attributes come from `chart-tokens`.
 */

const DEFAULT_TOP_N = 6;
const DEFAULT_EMPTY_MESSAGE = 'No spend in this range.';
/** Separates adjacent wedges without a second colour — the floor showing through, not a line. */
const WEDGE_SEPARATOR_WIDTH = 2;

const OTHER_KEY = '__other__';

function defaultOtherLabel(count: number): string {
  return `Other (${count})`;
}

function defaultFormatTooltipValue(segment: DonutSegment, percent: number): string {
  const share = percent < 1 && percent > 0 ? '<1%' : `${Math.round(percent)}%`;
  return segment.formattedValue ? `${segment.formattedValue} · ${share}` : share;
}

export function DonutChart({
  segments,
  width,
  height,
  topN = DEFAULT_TOP_N,
  otherLabel = defaultOtherLabel,
  selectedKey,
  onSelectSegment,
  hrefFor,
  centreMetric,
  centreLabel,
  formatTooltipValue = defaultFormatTooltipValue,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  innerRadiusRatio,
  static: isStatic = false,
  className,
}: DonutChartProps) {
  // Which wedge the tooltip points at — hover/tap/focus driven, deliberately independent of
  // `selectedKey` (click driven), the same split every sibling chart makes.
  const { active: hoveredKey, activeInput, getHoverProps } = useHoverActive<string>();
  // A real element, held as state rather than a ref, so the tooltip re-renders once the `<svg>`
  // mounts and Floating UI has a `contextElement` to clip against.
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const plotted = useMemo(
    () =>
      collapseDonutTail<DonutSegment>(segments, topN, (count, value) => ({
        key: OTHER_KEY,
        label: otherLabel(count),
        value,
      })),
    [segments, topN, otherLabel]
  );

  const geometry = useMemo(
    () => donutGeometry(width, height, innerRadiusRatio),
    [width, height, innerRadiusRatio]
  );
  const arcs = useMemo(() => layoutDonutArcs(plotted, geometry), [plotted, geometry]);

  // The single-accent rule, enforced here rather than trusted from the data: selection wins,
  // otherwise the FIRST breached segment in rank order, and only ever that one key.
  const breachedKey = useMemo(() => plotted.find((s) => s.breached)?.key ?? null, [plotted]);
  const accentKey = selectedKey ?? breachedKey;

  const activeArc = hoveredKey ? arcs.find((a) => a.datum.key === hoveredKey) : undefined;

  const tooltipRows: ChartTooltipRow[] = useMemo(() => {
    if (!activeArc) return [];
    return [
      {
        key: activeArc.datum.key,
        label: activeArc.datum.label,
        value: formatTooltipValue(activeArc.datum, activeArc.percent),
        color: activeArc.datum.key === accentKey ? SPEC_ACCENT : specSeriesColor(activeArc.index),
      },
    ];
  }, [activeArc, formatTooltipValue, accentKey]);

  // Only used for a touch tap or a keyboard focus move — a live pointer tracks the real cursor
  // instead (see `useChartTooltipFloating`). The centroid is already relative to the ring's
  // centre, so it is offset back into the `<svg>`'s own space here.
  const pinnedPoint = useMemo(() => {
    if (!activeArc) return null;
    return { x: geometry.cx + activeArc.centroid[0], y: geometry.cy + activeArc.centroid[1] };
  }, [activeArc, geometry.cx, geometry.cy]);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({
      // `static` never opens — a report has no pointer (converse-frontends#453 AC-1).
      open: !isStatic && hoveredKey !== null && svgElement !== null,
      anchorElement: svgElement,
      pinnedPoint: activeInput === 'hover' ? null : pinnedPoint,
    });

  const empty = arcs.length === 0;

  /** Still a ring, at the gridline tone — never a collapsed, zero-height gap. Drawn as a stroked
   *  circle on the band's own mid-radius, so its thickness is exactly the band's. */
  const emptyRing = (
    <circle
      cx={geometry.cx}
      cy={geometry.cy}
      r={(geometry.outerRadius + geometry.innerRadius) / 2}
      fill="none"
      stroke={SPEC_GRID}
      strokeWidth={geometry.outerRadius - geometry.innerRadius}
    />
  );

  /** The wedges. `static` strips every interaction prop — no tab stop, no `role="button"`, no
   *  handlers, no Floating UI reference props — but not one attribute that carries data. */
  const wedges = (
    <g transform={`translate(${geometry.cx}, ${geometry.cy})`}>
      {arcs.map((slice) => {
        const isAccent = slice.datum.key === accentKey;
        const isSelected = slice.datum.key === selectedKey;
        // A LINK wins over selection: a wedge that navigated and toggled on one click would do
        // two things the reader asked for one of. `Other` folds several entities into one wedge,
        // so it is never linked — same reason it is never selectable.
        const href = isStatic || slice.datum.key === OTHER_KEY ? undefined : hrefFor?.(slice.datum);
        const selectable =
          !isStatic && !href && Boolean(onSelectSegment) && slice.datum.key !== OTHER_KEY;
        const interactive = isStatic
          ? {}
          : {
              // A linked wedge's tab stop is the `<a>` that wraps it — the path itself must not be
              // a second one, or every model on the ring would take two tabs to walk past.
              tabIndex: href ? undefined : 0,
              role: selectable ? ('button' as const) : ('img' as const),
              'aria-pressed': selectable ? isSelected : undefined,
              onClick: selectable
                ? () => onSelectSegment?.(isSelected ? null : slice.datum.key)
                : undefined,
              onKeyDown: selectable
                ? (event: React.KeyboardEvent) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelectSegment?.(isSelected ? null : slice.datum.key);
                  }
                : undefined,
              ...getReferenceProps(getHoverProps(slice.datum.key)),
            };
        const wedge = (
          <path
            d={slice.path}
            fill={isAccent ? SPEC_ACCENT : specSeriesColor(slice.index)}
            stroke={SPEC_FLOOR}
            strokeWidth={WEDGE_SEPARATOR_WIDTH}
            strokeLinejoin="round"
            className="donut-wedge"
            aria-label={`${slice.datum.label}, ${formatTooltipValue(slice.datum, slice.percent)}${
              slice.datum.breached ? ', over ceiling' : ''
            }`}
            {...interactive}
          />
        );

        // An SVG `<a>` — the same element an HTML anchor is, in the SVG namespace: focusable and
        // Enter-activated with no handler of our own, and it WRAPS the path rather than replacing
        // it, so the hover tooltip's reference props stay exactly where they were.
        return href ? (
          <a key={slice.datum.key} href={href} className="donut-wedge-link">
            {wedge}
          </a>
        ) : (
          <React.Fragment key={slice.datum.key}>{wedge}</React.Fragment>
        );
      })}
    </g>
  );

  // ── `static`: a STANDALONE `<svg>` document, and nothing else ─────────────────────────────
  // See `DonutChartProps.static`. The centre numeral moves from DOM text into SVG `<text>`
  // because there is no DOM here — sound for a short numeral, which is why the empty state's
  // SENTENCE is placed under the ring rather than in the hole.
  if (isStatic) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}>
        {empty ? emptyRing : wedges}
        {empty ? (
          <text
            x={geometry.cx}
            y={height - 4}
            fontSize={11}
            fill={SPEC_TEXT_MUTED}
            textAnchor="middle">
            {emptyMessage}
          </text>
        ) : (
          <>
            {centreMetric ? (
              <text
                x={geometry.cx}
                y={geometry.cy}
                fontSize={16}
                fill={SPEC_TEXT_PRIMARY}
                textAnchor="middle"
                dominantBaseline="middle">
                {centreMetric}
              </text>
            ) : null}
            {centreLabel ? (
              <text
                x={geometry.cx}
                y={geometry.cy + 18}
                fontSize={9}
                fill={SPEC_TEXT_MUTED}
                textAnchor="middle"
                dominantBaseline="middle">
                {centreLabel}
              </text>
            ) : null}
          </>
        )}
      </svg>
    );
  }

  return (
    <div className={cn('donut-chart', className)} style={{ width, height }}>
      <svg
        ref={setSvgElement}
        width={width}
        height={height}
        role={empty ? 'presentation' : 'img'}
        aria-hidden={empty ? 'true' : undefined}
        aria-label={
          empty
            ? undefined
            : centreLabel && centreMetric
              ? `${centreLabel}: ${centreMetric}`
              : 'Share by segment'
        }>
        {empty ? emptyRing : wedges}
      </svg>

      {/* The hole's contents are DOM text, not SVG `<text>`: SVG text never wraps, which is the
          exact bug `ChartEmptyMessage` exists for — an empty-state sentence in the centre of a
          ring is precisely the case that spills off both ends. */}
      <div className="donut-centre">
        {empty ? (
          <span className="donut-centre-label">{emptyMessage}</span>
        ) : (
          <>
            {centreMetric ? <span className="donut-centre-metric">{centreMetric}</span> : null}
            {centreLabel ? <span className="donut-centre-label">{centreLabel}</span> : null}
          </>
        )}
      </div>

      <ChartTooltip
        visible={hoveredKey !== null}
        rows={tooltipRows}
        setFloating={setFloating}
        floatingStyles={floatingStyles}
        getFloatingProps={getFloatingProps}
      />
    </div>
  );
}
