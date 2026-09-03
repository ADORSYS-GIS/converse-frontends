import type { ReportExportPanelProps } from '../report-export-panel';

export interface ReportExportDialogProps extends ReportExportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The dialog's own title. Defaults to `Monthly report`, which is what the consumption export
   * has always been called. A dashboard-page export names the page it was opened from
   * (converse-frontends#453) — `Export · Overview` — because "Monthly report" would be wrong on
   * a report whose window is a 7-day range.
   */
  title?: string;
}
