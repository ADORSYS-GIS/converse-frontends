// ── foundations
export { cn } from './cn';
export { useResizeObserver } from './lib/use-resize-observer';
export type { ResizeObserverSize } from './lib/use-resize-observer';
export { useIsBelowLg, useIsBelowMd } from './lib/use-is-below-breakpoint';
export { useCommandPaletteShortcut } from './lib/use-command-palette-shortcut';
export { DefaultAnchor } from './lib/link-component';
export type { LinkComponent, LinkComponentProps } from './lib/link-component';

// ── shell
export { ConsoleShell } from './components/console-shell';
export type { ConsoleShellProps } from './components/console-shell';
export { ConsoleHeader } from './components/console-header';
export type { ConsoleHeaderProps } from './components/console-header';
export { AccountMenu } from './components/account-menu';
export type { AccountMenuProps } from './components/account-menu';
export { ThemeToggle } from './components/theme-toggle';
export type { ThemeToggleProps, ThemeTogglePreference } from './components/theme-toggle';
export { RailPanel } from './components/rail-panel';
export type { RailPanelProps } from './components/rail-panel';
export { NavSpine } from './components/nav-spine';
export type { NavSpineItem, NavSpineProps } from './components/nav-spine';
export { SubNav } from './components/sub-nav';
export type { SubNavItem, SubNavProps } from './components/sub-nav';
export { BottomSheet } from './components/bottom-sheet';
export type { BottomSheetProps } from './components/bottom-sheet';
export { SectionSheet } from './components/section-sheet';
export type { SectionSheetProps } from './components/section-sheet';
export { SectionSheetTrigger } from './components/section-sheet-trigger';
export type {
  SectionSheetTriggerIcon,
  SectionSheetTriggerProps,
} from './components/section-sheet-trigger';
export { SelectionSheet } from './components/selection-sheet';
export type { SelectionSheetProps } from './components/selection-sheet';

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
export type { RowAction, RowActionGroupProps } from './components/row-action-group';
export { Meter } from './components/meter';
export type { MeterProps } from './components/meter';
export { BudgetHero } from './components/budget-hero';
export type { BudgetHeroProps } from './components/budget-hero';
export { formatBillingPlanLimits } from './lib/billing-plan-limits';
export type { BillingPlanLimits } from './lib/billing-plan-limits';

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
export { DonutChart } from './components/donut-chart';
export type { DonutChartProps, DonutSlice } from './components/donut-chart';

// ── forms & actions
export { Button } from './components/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { Field } from './components/field';
export type { FieldProps, FieldInputProps, FieldTextareaProps } from './components/field';

export { SegmentedControl } from './components/segmented-control';
export type { SegmentedControlProps, SegmentedOption } from './components/segmented-control';

export { RailSelect } from './components/rail-select';
export type { RailSelectOption, RailSelectProps } from './components/rail-select';

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

export { CommandPalette, CommandPaletteTrigger } from './components/command-palette';
export type {
  CommandPaletteGroup,
  CommandPaletteItem,
  CommandPaletteProps,
  CommandPaletteTriggerProps,
} from './components/command-palette';

export { CreateApiKeyDialog } from './components/create-api-key-dialog';
export type {
  CreateApiKeyDialogProps,
  CreateApiKeyPlanOption,
} from './components/create-api-key-dialog';

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

// ── sections
// Screen sections — the zone-level compositions a route assembles (console-ui skill
// "Composition — sections in the library, the shell mounted once, pages only in stories").
// Presentational only: data via typed props, no fetching, no refine hooks, no routing.
// There is deliberately NO `*Page` export here: a monolithic page made every route remount its
// own shell. Full-page compositions live in Storybook (`src/pages-stories/`) and in
// `apps/console`'s own route implementations.

export { ScreenHeading } from './sections/screen-heading';
export type { ScreenHeadingProps } from './sections/screen-heading';

export { OverviewStatRow } from './sections/overview-stat-row';
export type {
  OverviewStatCardData,
  OverviewStatCardIcon,
  OverviewStatRowProps,
} from './sections/overview-stat-row';

export { SpendDashboard } from './sections/spend-dashboard';
export type { DashboardStatus, SpendDashboardProps } from './sections/spend-dashboard';

export { SpendShareSection } from './sections/spend-share';
export type { SpendShareSectionProps, SpendShareStatus } from './sections/spend-share';

export { LatencyDashboard } from './sections/latency-dashboard';
export type { LatencyDashboardProps } from './sections/latency-dashboard';

export { BudgetPanel } from './sections/budget-panel';
export type {
  BudgetNeedsAttentionProject,
  BudgetPanelProps,
  BudgetRefillRequestStatus,
  BudgetSummary,
} from './sections/budget-panel';

export { ApiKeysLedger } from './sections/api-keys-ledger';
export type {
  ApiKeyRow,
  ApiKeyStatus,
  ApiKeysDeleteTarget,
  ApiKeysLedgerProps,
  ApiKeysPagination,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from './sections/api-keys-ledger';

export { ManageProjectsLedger } from './sections/manage-projects-ledger';
export type {
  ManagePagination,
  ManageProjectsLedgerProps,
  ManageTotals,
  ProjectRow,
  ProjectStatus,
} from './sections/manage-projects-ledger';

export { ReviewQueue } from './sections/review-queue';
export type { AdminReviewTab, RefillRequestRow, ReviewQueueProps } from './sections/review-queue';

export { DecisionsLedger } from './sections/decisions-ledger';
export type {
  AdminReviewPagination,
  DecisionOutcome,
  DecisionRow,
  DecisionsLedgerProps,
} from './sections/decisions-ledger';

export { AuthScreen } from './sections/auth-screen';
export type { AuthScreenProps, AuthScreenStatus } from './sections/auth-screen';

// ── rail sections
// Each exports a `*_RAIL_LABEL` constant alongside its component: rail sections render their
// content BARE (no `RailPanel` of their own), so the same section can mount twice — inside a
// `RailPanel label={LABEL}` in the persistent `lg` rail, and inside a `SectionSheet label={LABEL}`
// below `lg` — without doubling the heading or letting the two copies' wording drift apart.

export { SCOPE_RAIL_LABEL, ScopeRail } from './sections/scope-rail';
export type { ScopeRailProps } from './sections/scope-rail';

export { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from './sections/overview-view-rail';
export type { OverviewViewRailProps } from './sections/overview-view-rail';

export { OVERVIEW_FILTERS_RAIL_LABEL, OverviewFiltersRail } from './sections/overview-filters-rail';
export type { OverviewFiltersRailProps } from './sections/overview-filters-rail';

export { OVERVIEW_SERIES_RAIL_LABEL, OverviewSeriesRail } from './sections/overview-series-rail';
export type { OverviewSeriesRailProps } from './sections/overview-series-rail';

export { OVERVIEW_EXPORT_RAIL_LABEL, OverviewExportRail } from './sections/overview-export-rail';
export type { OverviewExportRailProps } from './sections/overview-export-rail';

export { API_KEYS_FILTERS_RAIL_LABEL, ApiKeysFiltersRail } from './sections/api-keys-filters-rail';
export type { ApiKeysFiltersRailProps } from './sections/api-keys-filters-rail';

export { API_KEYS_HYGIENE_RAIL_LABEL, ApiKeysHygieneRail } from './sections/api-keys-hygiene-rail';
export type { ApiKeysHygiene, ApiKeysHygieneRailProps } from './sections/api-keys-hygiene-rail';

export {
  API_KEYS_LIFECYCLE_RAIL_LABEL,
  ApiKeysLifecycleRail,
} from './sections/api-keys-lifecycle-rail';
export type { ApiKeysLifecycleRailProps } from './sections/api-keys-lifecycle-rail';

export { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from './sections/manage-report-rail';
export type { ManageReportRailProps } from './sections/manage-report-rail';

export { MANAGE_FILTERS_RAIL_LABEL, ManageFiltersRail } from './sections/manage-filters-rail';
export type { ManageFiltersRailProps, ManageOption } from './sections/manage-filters-rail';

export { MANAGE_SELECTION_RAIL_LABEL, ManageSelectionRail } from './sections/manage-selection-rail';
export type { ManageSelectionRailProps } from './sections/manage-selection-rail';

export { REVIEW_DETAIL_RAIL_LABEL, ReviewDetailRail } from './sections/review-detail-rail';
export type { ReviewDetailRailProps } from './sections/review-detail-rail';
