export interface OverviewExportRailProps {
  onExport?: () => void;
  /** Button label. Defaults to overview.svg's own wording. */
  label?: string;
  /**
   * Inter prose caption below the action — e.g. "Full monthly report lives in Manage.", or,
   * while `disabled`, the reason the export isn't available. Always paired with `disabled` when
   * `disabled` is true (console-ui#324): a disabled action never has an undisclosed reason.
   */
  caption?: string;
  /**
   * True while the CSV export route doesn't exist yet (console-ui#324, tracked separately as
   * `#308`). Disables the button natively (no click reaches `onExport`) rather than wiring a
   * handler that would silently do nothing.
   */
  disabled?: boolean;
  className?: string;
}
