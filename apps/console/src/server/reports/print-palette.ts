/**
 * The chart palette a REPORT is drawn in, and the substitution that makes it real
 * (converse-frontends#453).
 *
 * `packages/ui-web/src/chart-tokens.ts` deliberately emits `var(--…)` strings into every SVG
 * `fill`/`stroke` attribute (ADR 0010 Decision 3c: "the attribute may carry a colour, never a hex
 * literal in that file"), so a chart re-resolves its ramp on a `data-theme` change with no
 * re-render. That is exactly right in a browser and useless in a PDF: Typst rasterises SVG
 * through `usvg`, which resolves neither CSS custom properties nor `var()`. An unsubstituted
 * `fill="var(--chart-rank-1)"` is not a wrong colour — it is an INVISIBLE wedge.
 *
 * So the export substitutes the variables for literals before writing the file. The values are
 * `theme.css`'s `wireframe` (light) block, because a report is printed on white paper and read
 * under someone else's lighting — the story's own non-functional AC: "the theme is legible in
 * print (light palette regardless of the viewer's theme)".
 *
 * **One deliberate divergence from `wireframe`, and its reason.** `--color-muted` is the theme's
 * FLOOR (`#ebebeb`), and charts use it as the cut-out stroke that separates a point marker (or a
 * ring wedge) from what is behind it. On a PDF page the thing behind is white, not the app's
 * floor, so the cut-out is white here. Using `#ebebeb` would draw a faint grey halo around every
 * marker on a white page — visible, and an artefact of nothing.
 *
 * Kept as an explicit map rather than parsing `theme.css`: this is a handful of values that must
 * be stable and reviewable, and a parser would turn a stylesheet edit into a silent report
 * restyle. `resolveCssVariables` throws on an unknown variable for the same reason — a token
 * added to a chart without a print value must fail the export loudly, never draw nothing.
 */

/** `theme.css` `[data-theme='wireframe']`, with the floor whitened for paper (see above). */
export const PRINT_CHART_PALETTE: Record<string, string> = {
  '--chart-rank-1': '#363636',
  '--chart-rank-2': '#636363',
  '--chart-rank-3': '#8b8b8b',
  '--chart-rank-4': '#afafaf',
  '--color-primary': '#b4441c',
  '--color-base-100': '#ffffff',
  '--color-base-200': '#ffffff',
  '--color-base-300': '#dedede',
  '--color-border': '#cfcfcf',
  '--color-subtle': '#6b6b6b',
  '--color-ink': '#1a1a1a',
  // The floor, whitened: on paper the marker cut-out sits on white, not on the app's `#ebebeb`.
  '--color-muted': '#ffffff',
  '--color-surface': '#ffffff',
  '--color-raised': '#dedede',
};

const CSS_VAR = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[^)]*)?\)/g;

/**
 * Replaces every `var(--token)` in an SVG document with its print literal.
 *
 * A `var()` whose token has no print value throws, naming it: silently leaving it in place would
 * produce a PDF with an invisible chart, which is the single worst outcome for a report — it looks
 * like "there was no data" rather than "the export is broken".
 */
export function resolveCssVariables(svg: string): string {
  const unknown = new Set<string>();
  const resolved = svg.replace(CSS_VAR, (_match, name: string) => {
    const value = PRINT_CHART_PALETTE[name];
    if (value === undefined) {
      unknown.add(name);
      return _match;
    }
    return value;
  });

  if (unknown.size > 0) {
    throw new Error(
      `[console] Report SVG references CSS variables with no print value: ` +
        `${[...unknown].sort().join(', ')}. Add them to PRINT_CHART_PALETTE ` +
        '(src/server/reports/print-palette.ts) — an unresolved var() renders as an invisible mark.'
    );
  }
  return resolved;
}
