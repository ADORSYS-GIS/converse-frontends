export interface SelectFieldOption {
  value: string;
  label: string;
}

/**
 * One dropdown — a controlled native `<select>` styled to the `Field` control treatment.
 * README §4 lists no dedicated "Select" primitive; `ScopeSelect` follows the same
 * native-select-plus-styling pattern for its own two dropdowns, and this is that pattern
 * extracted so every consumer shares one control instead of near-identical local copies.
 *
 * Named `SelectField`, not `RailSelect`, since the console's read-only screens now put these in a
 * horizontal toolbar rather than a rail (owner review 2026-08-29) — the old name described one
 * mount point rather than the control.
 */
export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  /**
   * `stacked` (default) puts the label above a full-width control — the rail column's shape.
   * `inline` puts the label beside a control sized to its own content, for a horizontal toolbar
   * where six stacked label/control pairs would be six columns of wasted width.
   */
  layout?: 'stacked' | 'inline';
  /**
   * Visually hides the label (`sr-only`) while keeping it as the trigger's real accessible name
   * (phase 9 — a select's chosen option already says what it is, e.g. "Last 30 days"; a label
   * beside it too is the "Group by Project Project All projects" stutter the owner flagged).
   */
  hideLabel?: boolean;
  className?: string;
}
