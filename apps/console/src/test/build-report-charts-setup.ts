/**
 * Vitest `globalSetup`: build the report chart renderer bundle before any test runs
 * (converse-frontends#453).
 *
 * `src/server/reports/panel-svg.ts` loads `report-charts/render.cjs` at runtime by path —
 * see `src/server/reports/render-charts.tsx` for why that bundle exists at all — so a test run on
 * a fresh checkout would otherwise fail with "the bundle is missing" rather than testing anything.
 *
 * Building it HERE, rather than expecting a developer to remember a build step, also means a test
 * run can never be silently exercising a stale bundle: esbuild rebuilds it from source every run,
 * in well under a second once warm.
 */
export default async function setup(): Promise<void> {
  const { buildReportCharts } = await import('../../scripts/build-report-charts.mjs');
  await buildReportCharts();
}
