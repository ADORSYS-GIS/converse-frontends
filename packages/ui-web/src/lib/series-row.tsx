import React from 'react';

/**
 * One named series: swatch, name, optional value, optional share.
 *
 * `ChartLegend` and `ShareBar` are the two places the console names a series, and they render the
 * SAME row — five elements, the same `data-emphasized` hook, the same `disabled`-drives-affordance
 * rule. Both wrote it out independently until this module existed, which meant two chances to
 * drift on the markup and two on the aria wiring. Paint is `theme.css`'s `series-row` /
 * `series-swatch`; the geometry differences between a wrapping legend and a full-width share list
 * are stated contextually in the `share-bar` block, so neither call site passes a utility.
 *
 * NO UPSTREAM: daisy ships no legend, and the two classes an author reaches for here by reflex —
 * `badge` and `progress` — are both on PRIMITIVES.md's not-adopted list.
 *
 * Every row is a `<button>` in both components — one markup, one set of tests — and the
 * non-interactive case is marked `disabled` rather than swapped for a `<span>`. `series-row` reads
 * `:disabled` for the cursor and the hover fill, so there is no affordance decision left at the
 * call site.
 */
export interface SeriesRowProps {
  /** The series colour — rank grey, or the one accent for the emphasised series. */
  color: string;
  label: string;
  /** The formatted magnitude, when the caller has one. */
  value?: React.ReactNode;
  /** The share of the total. `ShareBar` only; a legend has no percent column. */
  percent?: React.ReactNode;
  /** Selected or ceiling-breached — a step UP the grey ramp, never a second colour (ADR 0008). */
  emphasized: boolean;
  /**
   * `aria-pressed`, when the row is interactive. Left `undefined` by a read-only row so it does
   * not announce a toggle state it has no way to change.
   */
  pressed?: boolean;
  /**
   * The accessible name, when it must differ from the row's own text. The two consumers diverge
   * here on purpose: a legend row names itself (its text is a bare label), while a share row's text
   * already reads "name, value, share" and overriding that would throw the numbers away.
   */
  ariaLabel?: string;
  /** Omitted for a read-only row, which then renders `disabled`. */
  onSelect?: () => void;
  /**
   * A destination for this row. When set the row is an `<a>` rather than a `<button>` — the SAME
   * row, only reached differently, exactly the split `RankedSeriesRows` already makes for its own
   * `hrefFor`. A link WINS over `onSelect`: a row that both navigated and toggled a selection would
   * do two things on one click, and the navigation is the one the reader asked for.
   */
  href?: string;
}

export function SeriesRow({
  color,
  label,
  value,
  percent,
  emphasized,
  pressed,
  ariaLabel,
  onSelect,
  href,
}: SeriesRowProps) {
  // Identical cell content either way — extracted rather than duplicated so a linked row and a
  // selectable row can never drift into two different rows.
  const cells = (
    <>
      <span aria-hidden="true" className="series-swatch" style={{ backgroundColor: color }} />
      <span className="series-label">{label}</span>
      {value ? <span className="series-value">{value}</span> : null}
      {percent === undefined ? null : <span className="series-percent">{percent}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        data-emphasized={emphasized ? 'true' : 'false'}
        className="series-row">
        {cells}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      aria-pressed={onSelect ? pressed : undefined}
      aria-label={ariaLabel}
      data-emphasized={emphasized ? 'true' : 'false'}
      className="series-row">
      {cells}
    </button>
  );
}
