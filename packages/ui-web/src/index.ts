// ── foundations
export { cn } from './cn';
export {
  applyThemePreference,
  CONSOLE_THEME_NO_FLASH_SCRIPT,
  CONSOLE_THEME_STORAGE_KEY,
  readStoredThemePreference,
  resolveConsoleTheme,
} from './lib/theme';
export type { ConsoleTheme, ConsoleThemePreference } from './lib/theme';
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

// ── shell
export { ConsoleShell } from './components/console-shell';
export type { ConsoleShellProps } from './components/console-shell';
export { RailResizer } from './components/rail-resizer';
export type { RailResizerProps } from './components/rail-resizer';
export {
  INSPECTOR_RAIL_CLASS,
  INSPECTOR_RAIL_DEFAULT_WIDTH,
  INSPECTOR_RAIL_MAX_WIDTH,
  INSPECTOR_RAIL_MIN_WIDTH,
} from './lib/shell-grid';
export { ConsoleTopBar } from './components/console-top-bar';
export type { ConsoleTopBarProps } from './components/console-top-bar';
export { AccountBadge, shortAccountId } from './components/account-badge';
export type { AccountBadgeOption, AccountBadgeProps } from './components/account-badge';
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
export { dollarsToMicros, microsToDollars, parseNonNegativeInt } from './lib/parse-amount';
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
export { ShareBar } from './components/share-bar';
export type { ShareBarProps, ShareBarSegment } from './components/share-bar';
export { MultiSeriesSpendChart } from './components/multi-series-spend-chart';
export type {
  MultiSeriesSpendChartProps,
  MultiSeriesSpendPoint,
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from './components/multi-series-spend-chart';

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

export { SettingsRow } from './components/settings-row';
export type { SettingsRowProps } from './components/settings-row';

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
export type { ReviewDetailPanelProps, ReviewDecision } from './components/review-detail-panel';

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
  CreateApiKeyResult,
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
export type { OverviewStatCardData, OverviewStatRowProps } from './sections/overview-stat-row';

export { SpendDashboard } from './sections/spend-dashboard';
export type { DashboardStatus, SpendDashboardProps } from './sections/spend-dashboard';

export { MultiSeriesSpendBoard } from './sections/multi-series-spend-board';
export type { MultiSeriesSpendBoardProps } from './sections/multi-series-spend-board';

export { SpendShareSection } from './sections/spend-share';
export type { SpendShareSectionProps, SpendShareStatus } from './sections/spend-share';

export { RankedSeriesRows } from './sections/ranked-series-rows';
export type {
  RankedSeriesRow,
  RankedSeriesRowMeter,
  RankedSeriesRowsProps,
} from './sections/ranked-series-rows';

export { LatencyStatCards } from './sections/latency-stat-cards';
export type { LatencyStatCardsProps, LatencyStatRow } from './sections/latency-stat-cards';

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

// The operator overview's estate-wide sibling of `BudgetPressure` (admin-overview design batch,
// dashboard 4) — accounts ranked by their OWN consumption ratio rather than projects sharing one
// account's ceiling.
export { EstateBudgetPressure } from './sections/estate-budget-pressure';
export type {
  EstateBudgetPressureAccount,
  EstateBudgetPressureProps,
  EstateBudgetPressureStatus,
} from './sections/estate-budget-pressure';

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
export type {
  RefillRequestRow,
  ReviewQueuePagination,
  ReviewQueueProps,
} from './sections/review-queue';

// `/accounts/<id>/refill` (IA v3 phase 3 — refill moved from `RequestRefillDialog` to its own
// page): the amount-choice form and the caller's own request history, each a standalone Card zone.
export { RefillRequestForm } from './sections/refill-request-form';
export type {
  RefillAmountOption,
  RefillRequestFormProps,
  RefillRequestFormState,
} from './sections/refill-request-form';

export { RefillHistory } from './sections/refill-history';
export type {
  RefillHistoryProps,
  RefillHistoryRow,
  RefillHistoryState,
} from './sections/refill-history';

// `/admin/refill-policies` (an admin-only surface — owner ruling, converse-frontends#368: list at
// the bare path, `?create=true`/`?edit=<id>`/`?simulate=<id>` as mode-split modes, simulate never
// on the same view as create/edit). `RuleSetForm`/`ScenarioForm` are the typed authoring forms
// (the JSON-textarea version the owner flagged as "very non-human" is gone); `PolicySimulator`
// composes both for the simulate mode; `RefillPolicyManual` is the "how does it work" explainer +
// lifecycle diagram; `RefillPolicyStatusStrip` is the honest active-policy-set/-revision line, and
// `RefillPolicyLookup` is the list mode's own "which policy set do I look at" zone, since no
// procedure lists which policy sets exist.
export { PolicySimulator } from './sections/policy-simulator';
export type { PolicySimulationResult, PolicySimulatorProps } from './sections/policy-simulator';

export {
  createBlankRuleSet,
  RuleSetForm,
  toRuleDataJson,
  validateRuleSet,
} from './sections/rule-set-form';
export type {
  ComparisonOperator,
  RuleConditionValue,
  RuleEffect,
  RuleErrors,
  RuleSetErrors,
  RuleSetFormProps,
  RuleSetValue,
  RuleValue,
  ThresholdConditionValue,
  ThresholdErrors,
  ThresholdField,
} from './sections/rule-set-form';

export {
  createBlankScenario,
  ScenarioForm,
  toScenarioJson,
  validateScenario,
} from './sections/refill-scenario-form';
export type {
  ScenarioErrors,
  ScenarioFormProps,
  ScenarioValue,
} from './sections/refill-scenario-form';

export { RefillPolicyManual } from './sections/refill-policy-manual';
export type { RefillPolicyManualProps } from './sections/refill-policy-manual';

export {
  NO_POLICY_SET_ID_CAPTION,
  RefillPolicyStatusStrip,
} from './sections/refill-policy-status-strip';
export type {
  RefillPolicyStatusState,
  RefillPolicyStatusStripProps,
} from './sections/refill-policy-status-strip';

export { RefillPolicyLookup } from './sections/refill-policy-lookup';
export type { RefillPolicyLookupProps } from './sections/refill-policy-lookup';

export { AuthScreen } from './sections/auth-screen';
export type { AuthScreenProps, AuthScreenStatus } from './sections/auth-screen';

// The operator overview's own "who is drawing the most" ledger (admin-overview design batch,
// dashboard 3) — accounts and projects on one ranking.
export { TopSpendersLedger } from './sections/top-spenders-ledger';
export type {
  TopSpenderRow,
  TopSpenderScope,
  TopSpendersLedgerProps,
} from './sections/top-spenders-ledger';

// ── toolbar sections
// Shell revamp phase 3 (right rail out) put every screen's PARAMETERS — range/bucket/group-by,
// filters, search — in one horizontal strip above the content, always visible, at every
// breakpoint; the 2026-08-30 rail-return round did not undo that (see `OverviewControls`'s
// docstring for the toolbar-vs-rail judgement call, and `ManageControls`'s for how the Projects
// screen's (née Manage) former FILTERS rail section made the same move). What the INSPECTOR rail
// carries instead is SELECTION-DRIVEN DETAIL and the scope quick-settings panel — see
// "── selection-driven detail" below.

export { OverviewControls } from './sections/overview-controls';
export type { OverviewControlsField, OverviewControlsProps } from './sections/overview-controls';

export { ApiKeysControls } from './sections/api-keys-controls';
export type { ApiKeysControlsProps } from './sections/api-keys-controls';

export { ApiKeysHygieneNotes } from './sections/api-keys-hygiene-notes';
export type { ApiKeysHygiene, ApiKeysHygieneNotesProps } from './sections/api-keys-hygiene-notes';

export { ManageControls } from './sections/manage-controls';
export type { ManageControlsProps, ManageOption } from './sections/manage-controls';

export {
  AccountSettings,
  NO_ACCOUNT_MESSAGE,
  UNNAMED_ACCOUNT_HINT,
  UNNAMED_ACCOUNT_LABEL,
} from './sections/account-settings';
export type {
  AccountSettingsAccount,
  AccountSettingsDetails,
  AccountSettingsPanel,
  AccountSettingsProps,
} from './sections/account-settings';

export { ACCOUNT_DIRECTORY_REGION_LABEL, AccountDirectory, NO_ACCOUNTS_MESSAGE } from './sections/account-directory';
export type { AccountDirectoryProps, AccountDirectoryRow } from './sections/account-directory';

export {
  detailRows,
  NO_PROJECTS_MESSAGE,
  PROJECT_SETTINGS_LABEL,
  ProjectSettings,
  ProjectSettingsDetail,
} from './sections/project-settings';
export type {
  ProjectSettingsPagination,
  ProjectSettingsProps,
  ProjectSettingsRow,
} from './sections/project-settings';

// ── selection-driven detail
// The persistent right INSPECTOR rail's content at `lg`+ (`ConsoleShell.rail`,
// `containers/inspector-rail.tsx`), and — below `lg`, where the rail is absent — the SAME content
// a `BottomSheet` hosts instead (`projects-centre.tsx`'s selected project; `admin-centre.tsx`
// hosts `ReviewDetailPanel` — from "── forms & actions" above — directly, since it already owned
// its whole decision surface and needed no section of its own). IA v3 phase 3 deletes the rail's
// former "otherwise" content, `InspectorSettingsPanel` (the scope quick-settings panel standing on
// `/accounts/<id>/overview`) — owner: "account mutations/creation/refill on the Overview rail
// makes no sense" — so `InspectorRail` now returns `undefined` (no rail at all) off a selection,
// the same as every other route that never showed one.

export { ProjectDetail } from './sections/project-detail';
export type { ProjectDetailProps } from './sections/project-detail';
