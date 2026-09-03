import type { MultiSeriesSpendScale } from '../components/multi-series-spend-chart';

/**
 * The pure, option-reading rules `dashboards.yaml` → `DashboardPanelView` needs on BOTH sides of
 * the package boundary — `apps/console/src/dashboards/panel-adapters.tsx` (a real `UsageQuery
 * Response` in, `toPanelView` out) and `packages/ui-web/src/pages-stories/spec-page.tsx` (a
 * mocked per-type fixture in, the SAME view shape out, so a YAML page is reviewable in Storybook
 * before its backend column exists).
 *
 * It exists because that pair drifted once for real: `spec-page.tsx` never read `options.style`,
 * so every `stacked-bars` series panel in `dashboards.yaml` (PRs #487, #492 — the three spend-by-
 * model boards and the settings family board) rendered as a plain line chart with a scale toggle
 * in Storybook while the real console drew a stack. An oracle that draws a DIFFERENT chart than
 * the page it certifies has stopped being an oracle.
 *
 * `packages/ui-web` must never depend on `apps/console` (the dependency runs the other way — see
 * `spec-page.tsx`'s own note on why it reads the checked-in YAML as a raw text import rather than
 * importing the app's engine), so this module holds only the READING rules that need no
 * `UsageQueryResponse` and no query client: which mark a series panel draws, which dimension a
 * panel reads, a `:key` link template applied to one row, and the Top-N tail collapse `ShareBar`
 * has no notion of on its own. Anything that has to touch real usage points (`totalsByGroup`,
 * `seriesByGroup`, …) stays in `panel-adapters.tsx`, because a fixture and a real response are not
 * the same shape and forcing them through one function would be the "half-reimplementing the
 * schema" this module's callers both already say they refuse to do.
 */

/** `options.scale` (`series`/`latency-series` only) — the panel's own default axis transform.
 *  Anything else (an unset field, a typo, a future value neither side has learned yet) reads as
 *  "no default", which is what both `use-dashboard.ts` and `spec-page.tsx` already fall back to
 *  `'linear'` for at their own call site. */
export function resolveDashboardScale(value: unknown): MultiSeriesSpendScale | undefined {
  return value === 'linear' || value === 'log' || value === 'indexed' ? value : undefined;
}

/** `options.style` (`series` only) — which MARK the panel draws. `'lines'` is the default and
 *  every panel's shape until 2026-09-03; `'stacked-bars'` is the owner's ruling of that date for
 *  daily spend × model (see `DashboardPanelView`'s own `style` doc comment for the full ruling).
 *  Never returns anything else, so a caller can switch on the result exhaustively. */
export function resolveDashboardSeriesStyle(value: unknown): 'lines' | 'stacked-bars' {
  return value === 'stacked-bars' ? 'stacked-bars' : 'lines';
}

/**
 * Which `group_by` dimension a panel READS — `options.dimension` when it names one (`'none'`
 * meaning no dimension at all: the panel plots/ranks the response's ungrouped total), otherwise
 * the query's first `group_by` entry (C12, converse-frontends#455).
 *
 * The ONE place this is decided — `panel-adapters.tsx`'s `panelDimension` and `spec-page.tsx`'s
 * (former) `readDimension` used to restate this independently, which is exactly the kind of
 * duplication that let `style` drift unnoticed; a second reading of the same rule is a second
 * place for it to go stale.
 */
export function resolveDashboardPanelDimension(
  declaredDimension: unknown,
  groupBy: readonly string[] | undefined
): string | undefined {
  if (declaredDimension === 'none') return undefined;
  if (typeof declaredDimension === 'string') return declaredDimension;
  return groupBy && groupBy.length > 0 ? groupBy[0] : undefined;
}

/**
 * `options.link`'s `:key` template → a real href for one row's group value.
 *
 * Deliberately ignorant of any "unassigned" sentinel: what a key MEANS (whether it should get no
 * link at all) is an app-level fact — `panel-adapters.tsx` owns `UNASSIGNED_KEY` and checks it
 * before calling this, and the fixtures `spec-page.tsx` draws from never manufacture that sentinel
 * as a row a reader could click. This function only ever does the one honest thing a template
 * substitution can: put the key where `:key` was.
 */
export function applyLinkTemplate(template: string | undefined, key: string): string | undefined {
  return template?.replace(':key', encodeURIComponent(key));
}

/** One `share`/ranked-shaped segment — the shape `collapseSegmentsTail` folds a tail into.
 *  `formattedValue` is optional to match `ShareBarSegment`'s own contract; the collapsed "Other"
 *  segment this module builds always sets it, via the caller's own formatter. */
export interface CollapsibleSegment {
  key: string;
  label: string;
  value: number;
  formattedValue?: string;
}

/**
 * Top-N + one summed tail segment, for `share` — the one panel type whose primitive (`ShareBar`)
 * has no Top-N notion of its own (`ranked` and `donut` take `topN` straight through to their own
 * primitive instead). `undefined`/oversized `topN` returns the list unchanged rather than a
 * spurious tail.
 *
 * Generic over the caller's own value formatter so a real response's money/count formatting
 * (`formatMetric`) and a fixture's synthetic-dollar formatting (`formatUsd`) can each supply their
 * own without this module guessing at units.
 */
export function collapseSegmentsTail<T extends CollapsibleSegment>(
  segments: T[],
  topN: number | undefined,
  formatValue: (value: number) => string,
  otherLabel: (tailCount: number) => string = (tailCount) => `Other (${tailCount})`
): T[] {
  if (topN === undefined || segments.length <= topN) return segments;
  const tail = segments.slice(topN);
  const value = tail.reduce((sum, segment) => sum + segment.value, 0);
  return [
    ...segments.slice(0, topN),
    {
      ...tail[0],
      key: '__other__',
      label: otherLabel(tail.length),
      value,
      formattedValue: formatValue(value),
    },
  ];
}
