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

// ── charts

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
