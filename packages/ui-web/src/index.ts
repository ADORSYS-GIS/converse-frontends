// ── foundations
export { cn } from './cn';
export { OVERLAY_CLASS, OVERLAY_ITEM_CLASS, OVERLAY_SEPARATOR_CLASS } from './lib/overlay';
export {
  BODY_CLASS,
  DATA_CLASS,
  DATA_INK_CLASS,
  ERROR_TEXT_CLASS,
  HERO_CEILING_CLASS,
  HERO_METRIC_CLASS,
  LABEL_CLASS,
  META_CLASS,
  METRIC_CLASS,
  PAGE_SUBTITLE_CLASS,
  PAGE_TITLE_CLASS,
  SECTION_TITLE_CLASS,
} from './lib/type-roles';
export { useResizeObserver } from './lib/use-resize-observer';
export type { ResizeObserverSize } from './lib/use-resize-observer';
export { useCommandPaletteShortcut } from './lib/use-command-palette-shortcut';
export { DefaultAnchor } from './lib/link-component';
export type { LinkComponent, LinkComponentProps } from './lib/link-component';

// ── revamp primitives
// The console visual revamp's phase 1 foundation (2026-08): the two-column console's card shell,
// list chrome and detail sheet. See `lib/type-roles.ts` for the type scale these compose.
export { Card } from './components/card';
export type { CardProps } from './components/card';
export { EmptyState } from './components/empty-state';
export type { EmptyStateProps } from './components/empty-state';
export { Pagination } from './components/pagination';
export type { PaginationProps } from './components/pagination';
export { DetailSheet } from './components/detail-sheet';
export type { DetailSheetProps } from './components/detail-sheet';

// ── shell
export { ConsoleShell } from './components/console-shell';
export type { ConsoleShellProps } from './components/console-shell';
export { ConsoleTopBar } from './components/console-top-bar';
export type { ConsoleTopBarProps } from './components/console-top-bar';
export { AccountBadge, shortAccountId } from './components/account-badge';
export type { AccountBadgeOption, AccountBadgeProps } from './components/account-badge';
export { AccountMenu } from './components/account-menu';
export type { AccountMenuProps } from './components/account-menu';
export { ThemeToggle } from './components/theme-toggle';
export type { ThemeToggleProps, ThemeTogglePreference } from './components/theme-toggle';
export { NavSpine } from './components/nav-spine';
export type { NavGroup, NavSpineItem, NavSpineProps } from './components/nav-spine';
export { SubNav } from './components/sub-nav';
export type { SubNavItem, SubNavProps } from './components/sub-nav';
export { BottomSheet } from './components/bottom-sheet';
export type { BottomSheetProps } from './components/bottom-sheet';

// ── data display
export { USD_DISPLAY_FLOOR, formatUsd, formatUsdAxis, formatUsdOf } from './lib/money';
export { formatMs, formatMsAxis } from './lib/duration';
export { StatCard } from './components/stat-card';
export type { StatCardDelta, StatCardProps } from './components/stat-card';
export { Sparkline } from './components/sparkline';
export type { SparklineProps } from './components/sparkline';
export { Tooltip, TooltipGroup } from './components/tooltip';
export type { TooltipAlign, TooltipProps, TooltipSide } from './components/tooltip';
export { LedgerTable } from './components/ledger-table';
export { ledgerRowVariants } from './components/ledger-table';
export type {
  LedgerColumn,
  LedgerSort,
  LedgerSortDirection,
  LedgerTableProps,
} from './components/ledger-table';
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
export { ShareBar } from './components/share-bar';
export type { ShareBarProps, ShareBarSegment } from './components/share-bar';

// ── forms & actions
export { Button } from './components/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { Field } from './components/field';
export type { FieldProps, FieldInputProps, FieldTextareaProps } from './components/field';

export { SegmentedControl } from './components/segmented-control';
export type { SegmentedControlProps, SegmentedOption } from './components/segmented-control';

export { Chevron } from './components/chevron';
export { DateRangeField, formatDateRange, presetRange } from './components/date-range-field';
export type {
  DateRangeFieldProps,
  DateRangePreset,
  DateRangeValue,
} from './components/date-range-field';
export { Checkbox, CheckboxGroup } from './components/checkbox';
export type { CheckboxGroupProps, CheckboxProps } from './components/checkbox';
export { SelectField } from './components/select-field';
export type { SelectFieldOption, SelectFieldProps } from './components/select-field';

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
} from './components/report-export-panel';

export { ReportExportDialog } from './components/report-export-dialog';
export type { ReportExportDialogProps } from './components/report-export-dialog';

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

export { AccountNameDialog } from './components/account-name-dialog';
export type {
  AccountNameDialogMode,
  AccountNameDialogProps,
} from './components/account-name-dialog';

export { CreateApiKeyDialog } from './components/create-api-key-dialog';
export type {
  CreateApiKeyDialogProps,
  CreateApiKeyPlanOption,
} from './components/create-api-key-dialog';

export { CreateProjectDialog } from './components/create-project-dialog';
export type {
  CreateProjectDialogProps,
  CreateProjectPlanOption,
} from './components/create-project-dialog';

// ── states
export { InlineStatus } from './components/inline-status';
export type { InlineStatusProps, PlaceholderNotice } from './components/inline-status';
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

export { PageHeader } from './sections/page-header';
export type { PageHeaderProps } from './sections/page-header';

export { ConsoleSidebar } from './sections/console-sidebar';
export type { ConsoleSidebarProps } from './sections/console-sidebar';

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

// Phase 4 — `/` now renders this section too (admin-only "Budget pressure" card), so it earns its
// barrel lines: `use-overview-screen.ts`/`use-admin-screen.ts` callers no longer need the
// `/src/sections/budget-pressure` subpath import the admin-only screen used while the barrel was
// mid-edit by parallel work.
export { BudgetPressure } from './sections/budget-pressure';
export type {
  BudgetPressureProject,
  BudgetPressureProps,
  BudgetPressureStatus,
} from './sections/budget-pressure';

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

export { ProjectsLedger } from './sections/projects-ledger';
export type {
  ProjectRow,
  ProjectsLedgerProps,
  ProjectsPagination,
  ProjectStatus,
} from './sections/projects-ledger';

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

// ── toolbar sections
// Shell revamp phase 3 (right rail out): the console has no persistent right rail anywhere any
// more. Every screen's parameters and the action that consumes them live in one horizontal strip
// above the content, always visible, at every breakpoint — see `OverviewControls`'s docstring for
// the toolbar-vs-rail judgement call, and `ManageControls`'s for how the Projects screen's (née
// Manage) former FILTERS rail section made the same move — search itself lives in `ProjectsLedger`
// 's own table toolbar now, not here. Selection-driven detail (a picked project, Admin's picked
// review request) now opens as a `DetailSheet` instead of retargeting a persistent aside — see
// `projects-centre.tsx`/`admin-centre.tsx` in `apps/console`.

export { OverviewControls } from './sections/overview-controls';
export type { OverviewControlsField, OverviewControlsProps } from './sections/overview-controls';

export { ApiKeysControls } from './sections/api-keys-controls';
export type { ApiKeysControlsProps } from './sections/api-keys-controls';

export { ApiKeysHygieneNotes } from './sections/api-keys-hygiene-notes';
export type { ApiKeysHygiene, ApiKeysHygieneNotesProps } from './sections/api-keys-hygiene-notes';

export { ManageControls } from './sections/manage-controls';
export type { ManageControlsProps, ManageOption } from './sections/manage-controls';

export {
  AccountPanel,
  NO_ACCOUNT_MESSAGE,
  UNNAMED_ACCOUNT_HINT,
  UNNAMED_ACCOUNT_LABEL,
} from './sections/account-panel';
export type { AccountPanelAccount, AccountPanelProps } from './sections/account-panel';

// ── selection-driven detail
// The un-railed content `DetailSheet` hosts once a row is picked (`projects-centre.tsx`'s
// selected project; `admin-centre.tsx` hosts `ReviewDetailPanel` — from "── forms & actions"
// above — directly, since it already owned its whole decision surface and needed no section of
// its own).

export { ProjectDetail } from './sections/project-detail';
export type { ProjectDetailProps } from './sections/project-detail';
