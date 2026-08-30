import type { ReportExportPanelProps } from '../report-export-panel';

export interface ReportExportDialogProps extends ReportExportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
