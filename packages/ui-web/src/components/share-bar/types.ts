export interface ShareBarSegment {
  /** Stable identity, matched against `selectedKey` — e.g. a project or model id. */
  key: string;
  /** Display label, already localized by the caller. */
  label: string;
  /** Raw magnitude. Shares are computed from the sum of every segment's value. */
  value: number;
  /** Pre-formatted value string (e.g. `$1.35`) — caller owns i18n/units, same contract as `ChartLegendItem`. */
  formattedValue?: string;
  /** This segment has breached a configured ceiling — renders in the accent, same as `selected`. */
  breached?: boolean;
}

export interface ShareBarProps {
  segments: ShareBarSegment[];
  /** Controlled selection — drives the accent (ADR 0008 Decision 6). */
  selectedKey?: string | null;
  /** Omit for a read-only share bar. */
  onSelectSegment?: (key: string | null) => void;
  /** Formats each row's percentage. Defaults to whole percent, with `<1%` for non-zero rounding to nothing. */
  formatPercent?: (percent: number) => string;
  className?: string;
}
