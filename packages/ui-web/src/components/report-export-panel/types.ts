import type { ReactNode } from 'react';

import type { SegmentedOption } from '../segmented-control';

export type ReportExportFormat = 'csv' | 'pdf';

export type ReportIncludeToggle = {
  id: string;
  label: string;
  checked: boolean;
};

export type LastExportEntry = {
  filename: string;
  date: string;
};

export type ReportExportParams = {
  period: string;
  groupBy: string;
  format: ReportExportFormat;
  includes: string[];
};

export type ReportExportPanelProps = {
  period: string;
  onPeriodChange: (period: string) => void;
  /** Rendered as-is — the panel does not own account/project scope, a `ScopeSelect` does. */
  scopeSlot: ReactNode;
  groupByOptions: SegmentedOption<string>[];
  groupBy: string;
  onGroupByChange: (value: string) => void;
  includeToggles: ReportIncludeToggle[];
  onToggleInclude: (id: string, checked: boolean) => void;
  format: ReportExportFormat;
  onFormatChange: (format: ReportExportFormat) => void;
  onGenerate: (params: ReportExportParams) => void;
  /** True while a report is being generated — the primary is the only control that disables. */
  generating?: boolean;
  lastExports: LastExportEntry[];
  className?: string;
};
