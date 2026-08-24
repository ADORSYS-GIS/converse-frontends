import type { LatencyRidgelineSeries } from '../../components/latency-ridgeline';
import type { NavSpineItem } from '../../components/nav-spine';
import type { SpendSeriesSeries } from '../../components/spend-series-chart';
import type { StatCardDelta } from '../../components/stat-card';

/** 12px line-glyph slot key for a stat card -- the page resolves these to the actual glyph
 * (structural, not decorative, per console-ui skill) so `fixtures.ts` stays plain data. */
export type OverviewStatCardIcon = 'spend' | 'projects' | 'keys' | 'requests';

export interface OverviewStatCardData {
  key: string;
  icon?: OverviewStatCardIcon;
  label: string;
  /** Pre-formatted numeral, e.g. "$142.55", "6", "41,208". */
  metric: string;
  delta?: StatCardDelta;
  /** Oldest-first sparkline series, rendered via `Sparkline`. */
  sparklineData: number[];
}

export interface OverviewSelectOption {
  value: string;
  label: string;
}

/** One right-rail `VIEW`/`FILTERS` dropdown -- a controlled native `<select>` styled to the
 * `Field` control treatment (no dedicated "Select" primitive exists in the component inventory). */
export interface OverviewSelectField {
  label: string;
  value: string;
  options: OverviewSelectOption[];
  onChange: (value: string) => void;
}

export type OverviewDashboardStatus = 'ready' | 'loading' | 'error';

export interface OverviewBudgetSummary {
  value: number;
  ceiling: number;
  /** Fraction (0-1) at/past which the meter turns `--signal`. Defaults to `BudgetHero`'s own 0.9. */
  threshold?: number;
  /** Inter prose caption, e.g. "account ceiling · 28% used · resets 01 Mar". */
  caption: string;
}

export interface OverviewNeedsAttentionProject {
  name: string;
  value: number;
  ceiling: number;
  threshold?: number;
  /** Inter prose caption, e.g. "91% of ceiling · 6 days left". */
  caption: string;
  refillActionLabel?: string;
}

export interface OverviewRefillRequestStatus {
  pendingCount: number;
  /** e.g. "submitted 2 days ago". */
  submittedLabel: string;
}

export interface OverviewPageProps {
  // ── header / shell chrome (ConsoleHeader slots)
  logoSrc?: string;
  logoAlt?: string;
  wordmark?: string;
  orgName: string;
  userEmail: string;
  userInitials: string;

  // ── nav (left rail)
  navItems: NavSpineItem[];
  adminNavItems?: NavSpineItem[];
  showAdmin?: boolean;

  // ── scope (left rail, read-only echo of the active account/project)
  scopeAccountLabel: string;
  scopeProjectLabel: string;

  // ── page header
  pageTitle?: string;
  /** e.g. "adorsys-gis · last 30 days · UTC". */
  scopeSubline: string;

  /** When set, renders an `InlineStatus` banner above the stat row -- the page-level empty
   * state ("no usage yet"), per README §6. Stat cards, the spend/latency charts and the
   * budget block should carry zeroed/empty data alongside this. */
  emptyMessage?: string;

  // ── stat row
  statCards: OverviewStatCardData[];
  statCardsLoading?: boolean;

  // ── SPEND dashboard
  spendSeries: SpendSeriesSeries[];
  /** Fallback width used only before the chart's own container has been measured (mobile-first
   * + flex-shell pass — console-ui skill "no overflow, ever": charts measure their container via
   * `useResizeObserver` rather than being forced to a fixed pixel width). */
  spendChartWidth: number;
  spendChartHeight: number;
  spendStatus?: OverviewDashboardStatus;
  spendErrorMessage?: string;
  onRetrySpend?: () => void;
  /** The currently highlighted series, echoed by the right-rail `SERIES` panel. The chart
   * primitive itself owns its internal highlight state (uncontrolled); this only drives the
   * rail's own legend and is fed back by `onSelectSeries`. */
  selectedSeriesKey?: string | null;
  onSelectSeries?: (key: string | null) => void;
  formatSpendLegendValue?: (series: SpendSeriesSeries) => string;
  formatSpendXTick?: (date: Date) => string;
  formatSpendYTick?: (value: number) => string;
  formatSpendTooltipValue?: (value: number) => string;

  // ── LATENCY dashboard
  latencySeries: LatencyRidgelineSeries[];
  /** Fallback width before measurement — see `spendChartWidth`. */
  latencyChartWidth: number;
  latencyChartHeight: number;
  latencyStatus?: OverviewDashboardStatus;
  latencyErrorMessage?: string;
  onRetryLatency?: () => void;
  onSelectLatencySeries?: (key: string | null) => void;
  formatLatencyXTick?: (value: number) => string;

  // ── BUDGET dashboard
  budget: OverviewBudgetSummary;
  needsAttentionProject?: OverviewNeedsAttentionProject;
  onRequestRefill?: () => void;
  refillRequestStatus?: OverviewRefillRequestStatus;
  onReviewInAdmin?: () => void;

  // ── right rail: VIEW / FILTERS
  rangeField: OverviewSelectField;
  bucketField: OverviewSelectField;
  groupByField: OverviewSelectField;
  accountFilterField: OverviewSelectField;
  projectFilterField: OverviewSelectField;
  modelFilterField: OverviewSelectField;

  // ── right rail: EXPORT
  onExportView?: () => void;
  exportLabel?: string;
  exportCaption?: string;

  className?: string;
}
