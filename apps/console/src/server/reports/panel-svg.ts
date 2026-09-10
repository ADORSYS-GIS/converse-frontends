import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels/types';

import { resolveCssVariables } from './print-palette';

/**
 * One resolved panel view → one standalone SVG document, rendered from the SAME `ui-web` chart
 * components the page draws (converse-frontends#453, and its first acceptance criterion).
 *
 * "The same components" is load-bearing rather than tidy: a report drawn by a second, report-only
 * chart implementation would drift from the screen the moment either changed, and a reader
 * comparing a PDF against the console would have no way to tell a rendering difference from a data
 * difference.
 *
 * **This module does not import them.** It loads `report-charts/render.cjs` — the
 * ahead-of-time bundle built by `scripts/build-report-charts.mjs` — by PATH, through
 * `createRequire`. `src/server/reports/render-charts.tsx` is the source, and its own header
 * explains at length why: a Next Route Handler runs in the react-server layer, where
 * `react-dom/server`'s `renderToStaticMarkup` is aliased to a function that throws and where any
 * module reaching `useState`/`useEffect` is a build error. Both were confirmed against the real
 * build, along with the escapes that do not work.
 *
 * What stays on THIS side of that boundary, and why:
 *
 *  - **`var(--…)` → print literals** (`print-palette.ts`). `chart-tokens.ts` emits CSS variables
 *    into every `fill`/`stroke`; Typst's SVG path resolves neither `var()` nor custom properties,
 *    so an unsubstituted token is an INVISIBLE mark rather than a wrong colour. It is a pure
 *    string function with its own tests, and keeping it here means a palette change needs no
 *    rebuild of anything.
 *  - **Nothing else.** No font injection: Typst falls back to its own embedded serif for SVG
 *    `<text>` with no `font-family`, verified directly against `typst 0.15.1` rather than assumed,
 *    so the axis labels the components already emit render as-is.
 *
 * Only the three CHART-shaped panel kinds produce an SVG. `stat`, `stat-group`, `ranked`, `share`,
 * `table` and `latency-cards` are DOM rows on screen — text and boxes, not marks — and the report
 * renders them as real Typst tables and stat grids, which beats a picture of a table: it is
 * selectable, searchable, and it reflows.
 */

export interface RenderedPanelChart {
  svg: string;
  /** The drawn box in px — becomes the panel's `chartAspect`, which is how the template knows to
   *  bound a wide board by width and a square ring by height. */
  width: number;
  height: number;
  /** The honesty caption `static` mode drops from the mark itself (a log/indexed axis note). */
  caption?: string;
}

interface ChartRendererModule {
  isChartPanelView: (view: DashboardPanelView) => boolean;
  renderPanelChart: (view: DashboardPanelView, span: 1 | 2) => RenderedPanelChart | null;
}

/** Where the bundle lives, most likely first. Two entries because the app's working directory
 *  differs between `pnpm --filter console …` (cwd = `apps/console`) and the standalone image
 *  (`CMD node apps/console/server.js` from `/app`) — the same two-shape problem `config.yaml` and
 *  `dashboards.yaml` already have, solved the same way rather than with a new env var. */
const BUNDLE_CANDIDATES = ['./report-charts/render.cjs', './apps/console/report-charts/render.cjs'];

let cached: ChartRendererModule | null = null;

/** Resolved once per process and cached: the bundle carries React and cannot change without a
 *  restart, and re-requiring it per export would re-evaluate a megabyte of module scope. */
function chartRenderer(): ChartRendererModule {
  if (cached) return cached;

  const override = process.env.CONSOLE_REPORT_CHARTS;
  const candidates = (override ? [override] : BUNDLE_CANDIDATES).map((candidate) =>
    isAbsolute(candidate) ? candidate : resolvePath(process.cwd(), candidate)
  );
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    // A deployment-shaped failure, not a request-shaped one: the image was built without the
    // bundle. Named paths, and the command that produces it, because that is the whole fix.
    throw new Error(
      '[console] The report chart renderer bundle is missing. Build it with ' +
        '`node apps/console/scripts/build-report-charts.mjs`. Looked at:\n' +
        candidates.map((candidate) => `  - ${candidate}`).join('\n')
    );
  }

  // `turbopackIgnore` is load-bearing, and was found by running the BUILT standalone server, not
  // by any unit test: without it Turbopack rewrites this into its own dynamic-require shim and the
  // first export fails with `Cannot find module as expression is too dynamic`. The comment is
  // Turbopack's documented escape for exactly this — "this specifier is resolved by Node at
  // runtime, leave it alone" — which is the whole point of loading the bundle by path.
  cached = createRequire(import.meta.url)(/* turbopackIgnore: true */ found) as ChartRendererModule;
  return cached;
}

/** Panel kinds that draw a mark. */
export function isChartPanelView(view: DashboardPanelView): boolean {
  return chartRenderer().isChartPanelView(view);
}

/**
 * The chart, as a standalone SVG document plus the box it was drawn in — or `null` when the panel
 * is not chart-shaped.
 *
 * Throws only for an unresolvable colour token (see `resolveCssVariables`) or a missing bundle:
 * failing the export is the correct outcome for "this PDF would contain an invisible chart".
 */
export function renderPanelSvg(view: DashboardPanelView, span: 1 | 2): RenderedPanelChart | null {
  const rendered = chartRenderer().renderPanelChart(view, span);
  if (!rendered) return null;
  return { ...rendered, svg: resolveCssVariables(rendered.svg) };
}

/** Test-only: drops the process cache so a test can point `CONSOLE_REPORT_CHARTS` elsewhere. */
export function resetChartRendererCache(): void {
  cached = null;
}
