export interface OverviewExportRailProps {
  onExport?: () => void;
  /** Button label. Defaults to overview.svg's own wording. */
  label?: string;
  /** Inter prose caption below the action, e.g. "Full monthly report lives in Manage.". */
  caption?: string;
  className?: string;
}
