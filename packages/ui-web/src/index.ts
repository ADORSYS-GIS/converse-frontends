// ── foundations
export { cn } from './cn';

// ── shell
export { ConsoleShell } from './components/console-shell';
export type { ConsoleShellProps, ConsoleShellTier } from './components/console-shell';
export { ConsoleHeader } from './components/console-header';
export type { ConsoleHeaderProps } from './components/console-header';
export { RailPanel } from './components/rail-panel';
export type { RailPanelProps } from './components/rail-panel';
export { NavSpine } from './components/nav-spine';
export type { NavSpineItem, NavSpineProps } from './components/nav-spine';
export { SubNav } from './components/sub-nav';
export type { SubNavItem, SubNavProps } from './components/sub-nav';
export { BottomSheet } from './components/bottom-sheet';
export type { BottomSheetProps } from './components/bottom-sheet';

// ── data display
export { formatMoney, formatMoneyOf } from './lib/money';
export { StatCard } from './components/stat-card';
export type { StatCardDelta, StatCardProps } from './components/stat-card';
export { Sparkline } from './components/sparkline';
export type { SparklineProps } from './components/sparkline';
export { LedgerTable } from './components/ledger-table';
export { ledgerRowVariants } from './components/ledger-table';
export type { LedgerColumn, LedgerTableProps } from './components/ledger-table';
export { StatusText } from './components/status-text';
export { statusTextVariants } from './components/status-text';
export type { StatusTextVariantProps, StatusTextProps } from './components/status-text';
export { RowActionGroup } from './components/row-action-group';
export { rowActionVariants } from './components/row-action-group';
export type { RowAction, RowActionGroupProps } from './components/row-action-group';
export { Meter } from './components/meter';
export type { MeterProps } from './components/meter';
export { BudgetHero } from './components/budget-hero';
export type { BudgetHeroProps } from './components/budget-hero';

// ── charts
export { ChartAxisBottom, ChartAxisLeft } from './components/chart-axis';
export type { ChartAxisBottomProps, ChartAxisLeftProps, ChartTick } from './components/chart-axis';
export { ChartTooltip } from './components/chart-tooltip';
export type { ChartTooltipProps, ChartTooltipRow } from './components/chart-tooltip';
export { ChartLegend } from './components/chart-legend';
export type { ChartLegendItem, ChartLegendProps } from './components/chart-legend';
export { SpendSeriesChart } from './components/spend-series-chart';
export type {
  SpendSeriesChartProps,
  SpendSeriesPoint,
  SpendSeriesSeries,
} from './components/spend-series-chart';
export { HistogramChart } from './components/histogram-chart';
export type { HistogramChartProps } from './components/histogram-chart';
export { LatencyRidgeline } from './components/latency-ridgeline';
export type { LatencyRidgelineProps, LatencyRidgelineSeries } from './components/latency-ridgeline';

// ── forms & actions
export { Button } from './components/button';
export type { ButtonProps, ButtonVariantProps } from './components/button';

export { Field } from './components/field';
export type { FieldProps, FieldInputProps, FieldTextareaProps } from './components/field';

export { SegmentedControl } from './components/segmented-control';
export type { SegmentedControlProps, SegmentedOption } from './components/segmented-control';

export { ScopeSelect } from './components/scope-select';
export type {
  ScopeSelectProps,
  ScopeSelectValue,
  ScopeOption,
  ScopeProjectOption,
} from './components/scope-select';

export { SecretReveal } from './components/secret-reveal';
export type { SecretRevealProps } from './components/secret-reveal';

export { TypedConfirmDialog } from './components/typed-confirm-dialog';
export type { TypedConfirmDialogProps } from './components/typed-confirm-dialog';

export { ReportExportPanel } from './components/report-export-panel';
export type {
  ReportExportPanelProps,
  ReportExportParams,
  ReportExportFormat,
  ReportIncludeToggle,
  LastExportEntry,
} from './components/report-export-panel';

export { ReviewDetailPanel } from './components/review-detail-panel';
export type {
  ReviewDetailPanelProps,
  ReviewHistoryRow,
  ReviewDecision,
} from './components/review-detail-panel';

// ── states
export { InlineStatus } from './components/inline-status';
export type { InlineStatusProps } from './components/inline-status';
export { SkeletonRow } from './components/skeleton-row';
export { skeletonRowVariants } from './components/skeleton-row';
export type { SkeletonRowProps } from './components/skeleton-row';
export { SkeletonMetric } from './components/skeleton-metric';
export type { SkeletonMetricProps } from './components/skeleton-metric';
export { ErrorLine } from './components/error-line';
export type { ErrorLineProps } from './components/error-line';
