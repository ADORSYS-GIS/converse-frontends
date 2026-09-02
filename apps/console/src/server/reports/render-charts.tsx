import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DonutChart } from '@lightbridge/ui-web/src/components/donut-chart';
import {
  MultiSeriesSpendChart,
  scaleAxisCaption,
} from '@lightbridge/ui-web/src/components/multi-series-spend-chart';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels/types';

/**
 * The chart renderer, and **the one module in this app that Next never compiles**
 * (converse-frontends#453).
 *
 * ---------------------------------------------------------------------------------------------
 * WHY IT IS BUILT SEPARATELY, WHICH IS THE WHOLE POINT OF THIS FILE
 * ---------------------------------------------------------------------------------------------
 * The story's first acceptance criterion is that the report's charts come from `renderToStaticMarkup`
 * over the SAME `ui-web` components the page draws. Rendering them in a plain Node process works
 * exactly as that AC predicted — it is covered without a DOM by `report-data.test.ts` and by
 * `multi-series-spend-chart`'s own `static` block.
 *
 * What does NOT work is doing it from a module Next compiles into a Route Handler, and neither
 * half of that is a bug we can fix in our own code:
 *
 *  1. A Route Handler lives in Next's **react-server layer**, where `react-dom/server` is ALIASED
 *     to a shim whose `renderToStaticMarkup` is literally `() => { throw }`
 *     (`next/dist/build/webpack/alias/react-dom-server.js`). Even if the build let it through, the
 *     call would throw at runtime.
 *  2. That same layer refuses any module reaching `useState`/`useEffect`/`useLayoutEffect` —
 *     which every chart in `ui-web` does, correctly, because on screen they are interactive.
 *
 * So this file is bundled AHEAD of the Next build by `scripts/build-report-charts.mjs` into a
 * single dependency-free CommonJS file (`report-charts/render.cjs`), and
 * `panel-svg.ts` loads it by PATH at runtime through `createRequire`. Next's bundler
 * never sees it, so neither rule applies, and React, `react-dom/server` and the chart components
 * inside it are the ordinary npm/workspace ones rather than Next's server-layer aliases.
 *
 * Alternatives that were tried against the real build first, and why they are not here:
 *
 *  - **`serverExternalPackages`** — the documented escape for "a package that must not be
 *    bundled". It suppresses nothing here: the flagged module is OUR file, not `react-dom`, and
 *    naming `@lightbridge/ui-web` is refused outright ("conflicts with transpilePackages").
 *    Verified, not assumed.
 *  - **`'use client'` on this file** — makes it a client REFERENCE. A Route Handler importing it
 *    gets a proxy object, not a function it can call.
 *  - **A hand-written element-to-string serializer** — a second React renderer, which is exactly
 *    the "second implementation that drifts" this story exists to avoid.
 *  - **Rendering the charts in `apps/typst-render`** — would put React and `ui-web` inside a
 *    service whose entire design is "no dependencies", and invert who owns the chart.
 *
 * ---------------------------------------------------------------------------------------------
 * WHAT IT DOES
 * ---------------------------------------------------------------------------------------------
 * Nothing beyond calling the components in `static` mode. Colour-token substitution stays in
 * `print-palette.ts`, on the Next side: it is a pure string function with its own tests, and
 * keeping it out of the bundle means a palette change does not need a rebuild of anything.
 */

/** The pixel box a chart is drawn into, by the panel's own grid span. Chosen against the
 *  template's A4 content width (`_lib/report.typ`: 210 mm page, 18 mm margins ≈ 174 mm), so a
 *  full-width chart lands near 1:1 and a half-width one is scaled DOWN — upscaling an SVG is
 *  lossless, but it would blow the 9 px tick labels out of proportion. */
export const REPORT_CHART_WIDTH: Record<1 | 2, number> = { 1: 480, 2: 980 };
export const REPORT_CHART_HEIGHT: Record<1 | 2, number> = { 1: 220, 2: 260 };

export interface RenderedPanelChart {
  /** Standalone SVG markup, still carrying `var(--…)` colour tokens — `print-palette.ts`
   *  substitutes them on the Next side. */
  svg: string;
  /** The drawn box in px. Becomes the panel's `chartAspect`, which is how the template knows to
   *  bound a wide board by width and a square ring by height. */
  width: number;
  height: number;
  /** The honesty caption `static` mode drops from the mark itself (a log/indexed axis note). */
  caption?: string;
}

/** Panel kinds that draw a mark. Everything else is text on paper, and the report renders it as a
 *  real Typst table rather than a picture of one. */
export function isChartPanelView(view: DashboardPanelView): boolean {
  return view.kind === 'series' || view.kind === 'latency-series' || view.kind === 'donut';
}

export function renderPanelChart(view: DashboardPanelView, span: 1 | 2): RenderedPanelChart | null {
  const width = REPORT_CHART_WIDTH[span];
  const height = REPORT_CHART_HEIGHT[span];

  // A ring is SQUARE — drawn in the panel's chart height on both axes, the same rule
  // `panel-renderers.tsx`'s `DonutBody` applies from its measured box.
  let drawnWidth = width;
  let element: React.ReactElement;
  let caption: string | undefined;

  switch (view.kind) {
    case 'series':
      caption =
        [scaleAxisCaption(view.scale), view.truncationCaption].filter(Boolean).join(' ') ||
        undefined;
      element = (
        <MultiSeriesSpendChart
          series={view.series}
          width={width}
          height={height}
          scale={view.scale}
          formatValue={view.formatValue}
          formatYTick={view.formatYTick}
          emptyMessage={view.emptyMessage}
          static
        />
      );
      break;

    case 'latency-series':
      caption = scaleAxisCaption(view.scale) ?? undefined;
      element = (
        <MultiSeriesSpendChart
          series={view.series}
          width={width}
          height={height}
          scale={view.scale}
          // Latency is milliseconds, not dollars — the identical override `panel-renderers.tsx`
          // applies on screen. A `$412` p95 is the same fabricated unit on paper as it is there.
          formatValue={(value) => `${Math.round(value)} ms`}
          formatYTick={(value) => `${Math.round(value)} ms`}
          emptyMessage={view.emptyMessage}
          static
        />
      );
      break;

    case 'donut':
      drawnWidth = height;
      element = (
        <DonutChart
          segments={view.segments}
          width={drawnWidth}
          height={height}
          topN={view.topN}
          centreMetric={view.centreMetric}
          centreLabel={view.centreLabel}
          emptyMessage={view.emptyMessage}
          static
        />
      );
      break;

    default:
      return null;
  }

  return { svg: renderToStaticMarkup(element), width: drawnWidth, height, caption };
}
