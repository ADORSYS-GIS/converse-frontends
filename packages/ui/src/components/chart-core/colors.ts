/**
 * Chart colour system for ADR-0008 Decision 6 ("the signature move"):
 * https://github.com/ADORSYS-GIS/converse-frontends/blob/main/docs/adr/0008-console-shell-inversion-and-visual-direction.md
 *
 * Chart series are a **monochrome grey ramp** — never hue. The orange accent
 * (`#DA5C2C`, Axiom's single accent) appears in a chart only for the series the
 * viewer selected or one that has breached a ceiling: orange means "this needs
 * you," never decoration.
 *
 * These are plain constants, not theme tokens. ADR-0008's Axiom-derived dark
 * palette (`#000` floor / `#111` header / `#191919` panels / `#DA5C2C` accent) is
 * not yet wired into `packages/ui/src/design/tokens.ts` or the
 * `ThemePreferenceProvider` — that re-pointing is ADR-0008 Follow-up 9, a
 * separate ticket. Charts render uncontained on the `#000` floor per Decision 3,
 * so this module hardcodes the values it needs against that specific surface
 * rather than reading a not-yet-existent chart theme. Re-point these at real
 * tokens when Follow-up 9 lands.
 *
 * `GREY_RAMP` and the accent's contrast against `#000` are validated with the
 * `dataviz` skill's `validate_palette.js` (`--ordinal --mode dark --surface
 * "#000000"`) — all four ordinal checks (lightness-monotone, adjacent ΔL ≥ 0.06,
 * light-end contrast, single hue) pass, and every step (including the darkest,
 * #666666) clears the ≥3:1 mark-contrast floor against `#000`.
 */

/** The surface every chart primitive here assumes it renders on (ADR-0008 Decision 3). */
export const CHART_SURFACE = '#000000';

/**
 * Monochrome series ramp, light → dark, validated ordinal (see module doc).
 * Assigned in fixed order by series slot — never re-sorted by value — same rule
 * as a categorical hue ramp, just without hue. Cycles (via `seriesColor`) past 5
 * series; per the dataviz skill, a chart that legitimately needs more than this
 * many concurrently distinguishable series should fold extras into "Other" or
 * facet rather than lean on a 6th indistinguishable grey.
 */
export const GREY_RAMP = ['#F2F2F2', '#C7C7C7', '#9E9E9E', '#7A7A7A', '#666666'] as const;

/** Axiom's single accent — CTA/active-state colour, reused here as the chart "needs you" signal. */
export const CHART_ACCENT = '#DA5C2C';

/** Hairline gridlines/axis lines: one step off the `#000` floor, deliberately near-invisible. */
export const CHART_GRID = '#242424';

/** Axis ticks, legend labels, tooltip body — text tokens, never a series colour (marks-and-anatomy.md). */
export const CHART_TEXT_PRIMARY = '#EDEDED';
export const CHART_TEXT_MUTED = '#8F8F8F';

/**
 * Stroke-dasharray values for line/area series, indexed the same as `GREY_RAMP`.
 * A monochrome ramp has no chroma to lean on for CVD separation, so line series
 * carry a second, colour-independent identity channel by default (the dataviz
 * skill's "encode identity by more than lightness alone" accessibility rule).
 * Index 0 is solid — the most common single-series case draws a plain line.
 */
export const DASH_PATTERNS = ['', '6 4', '2 3', '9 3 2 3', '1 3'] as const;

export interface SeriesColorOptions {
  /** The viewer selected this series (tap-to-highlight in the legend, etc). */
  selected?: boolean;
  /** This series has breached a configured ceiling (budget/quota, latency SLO, ...). */
  breached?: boolean;
}

/**
 * Resolve the colour for series `index` under ADR-0008 Decision 6: grey by
 * default, the accent only when selected or breached — never both meanings at
 * once confused, and never a hue-based "series N" colour.
 */
export function seriesColor(index: number, options?: SeriesColorOptions): string {
  if (options?.selected || options?.breached) {
    return CHART_ACCENT;
  }
  return GREY_RAMP[((index % GREY_RAMP.length) + GREY_RAMP.length) % GREY_RAMP.length];
}

/** Dash pattern for series `index`, cycling alongside `seriesColor`'s ramp. */
export function seriesDash(index: number): string {
  return DASH_PATTERNS[
    ((index % DASH_PATTERNS.length) + DASH_PATTERNS.length) % DASH_PATTERNS.length
  ];
}
