import {
  CHART_ACCENT,
  GREY_RAMP,
  seriesColor as chartCoreSeriesColor,
  seriesDash,
} from '@lightbridge/ui/src/components/chart-core/colors';
import type { SeriesColorOptions } from '@lightbridge/ui/src/components/chart-core/colors';

export { seriesDash };
export type { SeriesColorOptions };

/**
 * Spec-sheet chart colours (docs/design/console-redesign/README.md §2.4), consumed
 * alongside `@lightbridge/ui/src/components/chart-core`'s DOM-free math (scales,
 * bins, `seriesColor`'s accent/breach/selection decision) per ADR 0009 Decision 5.
 *
 * **Recorded divergence** (batch brief: "where a constant disagrees with the spec
 * sheet, the SPEC wins"): `chart-core/colors.ts`'s own literal hex constants were
 * authored for the Expo/RN build before this token sheet existed, and disagree
 * with it:
 *   - `GREY_RAMP` there is `#F2F2F2 → #C7C7C7 → #9E9E9E → #7A7A7A → #666666`;
 *     the spec's ramp is `#b4b4b4 (--body) → #7c7c7c → #565656 → #3a3a3a+ (--line)`.
 *   - `CHART_GRID` there is `#242424`; the spec's gridline colour is `--raised`
 *     `#202020`, with the baseline drawn in `--line` `#3a3a3a` instead (chart-core
 *     uses one constant for both).
 *   - `CHART_TEXT_MUTED`/`CHART_TEXT_PRIMARY` there are `#8F8F8F`/`#EDEDED`; the
 *     spec's tick/label and primary text colours are the token-sheet `--muted`
 *     `#606060` and `--strong` `#eeeeee`.
 *
 * `specSeriesColor` below keeps chart-core's *behaviour* verbatim — it still calls
 * `seriesColor(index, options)` to decide "is this the accent (selected/breached)
 * or grey rank N" — and only remaps the returned grey step onto the spec's ramp by
 * rank, so the accent/selection/breach logic and the rank-cycling-past-5-series
 * behaviour stay exactly what `chart-core/colors.test.ts` already covers.
 *
 * **ADR 0010 Decision 3c / Decision 5**: these constants are the one sanctioned hex
 * exception -- SVG `fill`/`stroke` attributes cannot be Tailwind classes -- but the
 * exception is that the *attribute* may carry a colour, never a hex *literal in this
 * file*. Every constant below is a `var(--…)` string resolving through
 * `packages/ui-web/src/theme.css`'s `black`/`wireframe` theme blocks (the single
 * colour source), which SVG presentation attributes accept natively in every
 * evergreen browser -- so the ramp re-resolves on a `data-theme` change with no
 * `getComputedStyle` polling or React re-render required. The 4-step series-rank
 * ramp has no single daisy variable slot, so `theme.css` declares
 * `--chart-rank-1..4` directly in each theme block (console-ui skill "Charts").
 */
export const SPEC_GREY_RAMP = [
  'var(--chart-rank-1)',
  'var(--chart-rank-2)',
  'var(--chart-rank-3)',
  'var(--chart-rank-4)',
] as const;
export const SPEC_ACCENT = 'var(--color-primary)'; // --signal: identical accent/breach role, theme-dependent hex
export const SPEC_GRID = 'var(--color-raised)'; // gridlines
export const SPEC_BASELINE = 'var(--color-border)'; // --line: chart baseline / axis rule
export const SPEC_TEXT_PRIMARY = 'var(--color-ink)'; // --strong / `ink`
export const SPEC_TEXT_MUTED = 'var(--color-subtle)'; // --muted / `subtle`: tick labels, captions
export const SPEC_SURFACE = 'var(--color-surface)'; // --panel / `surface`: tooltip card fill
export const SPEC_FLOOR = 'var(--color-muted)'; // --floor / `muted` bg: point-marker cutout stroke

/**
 * Resolve a series colour under the spec's ramp, using chart-core's own
 * `seriesColor` for the accent/grey decision (see module doc for why).
 */
export function specSeriesColor(index: number, options?: SeriesColorOptions): string {
  const chartCoreColor = chartCoreSeriesColor(index, options);
  if (chartCoreColor === CHART_ACCENT) {
    return SPEC_ACCENT;
  }
  const rank = (GREY_RAMP as readonly string[]).indexOf(chartCoreColor);
  const specIndex = rank === -1 ? 0 : Math.min(rank, SPEC_GREY_RAMP.length - 1);
  return SPEC_GREY_RAMP[specIndex];
}
