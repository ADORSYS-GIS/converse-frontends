import type { ReactNode } from 'react';

/** The optional per-row `Meter` (e.g. a per-model draw on a shared ceiling). Mirrors `MeterProps`'
 *  own `value`/`ceiling`/`threshold` triple rather than importing it directly, so this module
 *  stays a pure data contract with no component dependency. */
export interface RankedSeriesRowMeter {
  value: number;
  ceiling: number;
  /** Fraction (0–1) at/past which the meter turns `--signal`. Defaults to `Meter`'s own 0.9. */
  threshold?: number;
}

export interface RankedSeriesRow {
  /** Stable identity — matched against `selectedKey`, and against a chart's own series key when
   *  a caller wires the two together (the same "one series identity, several renderings"
   *  convention `SpendSeriesChart`/`ShareBar` already share). */
  key: string;
  /** Display label, already localized/resolved by the caller (never a raw id — see the console-ui
   *  skill's "never a raw account UUID as a visible label"). */
  label: string;
  /** Raw magnitude — rank and the share micro-bar are both computed from this. */
  value: number;
  /** Pre-formatted value string (e.g. `$61.20`). Caller owns i18n/units. */
  formattedValue?: string;
  /**
   * Chronological magnitudes behind this row's sparkline, oldest first. Each row is scaled to its
   * OWN max (never a domain shared across rows) — a dominant row must not flatten a smaller row's
   * shape to a near-straight line. Fewer than 2 points renders a flat dash, never a broken path.
   */
  sparklinePoints?: number[];
  /** An optional per-row draw-on-a-ceiling meter (e.g. budget consumption). Omitted rows render no
   *  meter line at all — never a track against a fabricated ceiling. */
  meter?: RankedSeriesRowMeter;
  /** Signed change vs. the comparison period, when the caller has one to show. */
  delta?: number;
  /** Pre-formatted delta string. Rendered with a glyph, never green/red (console-ui skill
   *  "States": "Deltas are never green/red — direction is glyph + wording in greys"). */
  formattedDelta?: string;
  /** This row has breached a configured ceiling — always renders in the accent, selected or not. */
  breached?: boolean;
  /** De-emphasized label colour — for a sentinel identity (`sentinel-labels.ts`'s "Unidentified —
   *  Keycloak/GitHub") or another fallback the row still needs to name honestly but not draw
   *  attention to. Never combined with `breached` in practice; `breached` wins if both are set. */
  subtle?: boolean;
}

export interface RankedSeriesRowsProps {
  rows: RankedSeriesRow[];
  /** Ranks `1..topN` render as individual rows; anything past that is summed into one "Other"
   *  row. Defaults to 8. */
  topN?: number;
  /** Formats the "Other" row's label from the number of rows it folds in, e.g.
   *  `(n) => \`Other (${n} accounts)\`` — the noun varies per lens, so the caller supplies it.
   *  Defaults to a bare `Other (N)`. */
  otherLabel?: (count: number) => string;
  /**
   * `'value'` (default) orders the visible rows by magnitude, largest first — the same axis that
   * decides rank colour and the Top-N/Other split. `'delta'` re-orders the SAME visible set by
   * the size of its change (largest absolute movement first, either direction) without changing
   * which rows count as "visible" vs "Other" — bucket membership stays a value concept, only the
   * reading order changes.
   */
  sortMode?: 'value' | 'delta';
  /** Controlled selection — drives the accent, same as `ShareBar`. */
  selectedKey?: string | null;
  /** Omit for a read-only list. The "Other" row and the zero-value tail are never selectable,
   *  regardless of this prop — there is no single series behind either to select. */
  onSelect?: (key: string | null) => void;
  /** Shown over the still-rendered (empty) list frame when `rows` has no entries at all. */
  emptyMessage?: ReactNode;
  className?: string;
}
