import type { ReactNode } from 'react';

import type { PlaceholderNotice } from '../inline-status';
import type { SegmentedOption } from '../segmented-control';

export type ReportExportFormat = 'csv' | 'pdf';

export type ReportIncludeToggle = {
  id: string;
  label: string;
  checked: boolean;
};

export type ReportExportParams = {
  /** `YYYY-MM`. Absent on a DASHBOARD-page export, whose window is the page's own range picker
   *  and is echoed read-only (`rangeEcho`) rather than re-picked in the dialog. */
  period?: string;
  /** Absent for the same reason: a dashboard report's grouping is `dashboards.yaml`'s, per panel,
   *  and a dialog control that appeared to change it would be lying. */
  groupBy?: string;
  format: ReportExportFormat;
  includes: string[];
};

export type ReportExportPanelProps = {
  /**
   * The month picker. OPTIONAL since converse-frontends#453: the consumption report is a
   * per-MONTH document and picks its own period here, while a dashboard-page report inherits the
   * window from the page's range picker — echoing it as text (`rangeEcho`) instead of offering a
   * second, competing control that could disagree with the page the reader is looking at.
   * Supplied with `onPeriodChange` or not at all.
   */
  period?: string;
  onPeriodChange?: (period: string) => void;
  /**
   * A read-only statement of the window this report covers, e.g. `This month · 1–14 Sep 2026 ·
   * UTC`. Rendered in place of the period picker. Purely an echo — the dialog cannot change it.
   */
  rangeEcho?: string;
  /** Rendered as-is — the panel does not own account/project scope, a `ScopeSelect` does. Omitted
   *  by a dashboard export, whose scope is the route it was opened from. */
  scopeSlot?: ReactNode;
  /** Omitted together with `groupBy`/`onGroupByChange` when the report's grouping is not the
   *  reader's to choose. */
  groupByOptions?: SegmentedOption<string>[];
  groupBy?: string;
  onGroupByChange?: (value: string) => void;
  includeToggles: ReportIncludeToggle[];
  onToggleInclude: (id: string, checked: boolean) => void;
  format: ReportExportFormat;
  onFormatChange: (format: ReportExportFormat) => void;
  onGenerate: (params: ReportExportParams) => void;
  /** True while a report is being generated — the primary is the only control that disables. */
  generating?: boolean;
  /**
   * The outcome of pressing `Generate report` when report export isn't wired yet — a non-alert
   * notice (console-ui#325), rendered beside the primary rather than as an `ErrorLine`: nothing
   * failed, so there is nothing to retry.
   */
  notice?: PlaceholderNotice;
  /**
   * A real failure — the renderer was unreachable, or the template did not compile. Distinct from
   * `notice` on purpose (spec §8.3's `Failed` state): something broke, the form keeps every input,
   * and `Retry` re-runs the same request. Never both at once.
   */
  error?: { message: string; onRetry?: () => void };
  className?: string;
};
