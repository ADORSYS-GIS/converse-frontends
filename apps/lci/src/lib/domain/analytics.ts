import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '@lightbridge/ui-web/src/components/multi-series-spend-chart/types';
import type { StatCardDelta } from '@lightbridge/ui-web/src/components/stat-card/types';
import type {
  DashboardPanelType,
  DashboardPanelView,
  DashboardTableColumn,
  DashboardTableRow,
} from '@lightbridge/ui-web/src/sections/dashboard-panels/types';

/**
 * Review analytics for the Overview page and a repository's Insights tab (ADR 0018): the range
 * vocabulary, the shapes `GET /analytics/reviews` and `GET /analytics/feedback` return, the
 * declarative panel list, and the adapters that turn a response into render-ready
 * `DashboardPanelView`s for `ui-web`'s panel kit.
 *
 * Nothing here aggregates rows. Every figure is read off an aggregate the control plane computed
 * for exactly the window the page asked for; the adapters only format, order and caption. That is
 * what keeps a KPI on these pages from ever again being a count of whatever page of `/tasks`
 * happened to come back.
 */

// ── Range ────────────────────────────────────────────────────────────────────────────────────────

export const ANALYTICS_RANGES = [
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  '7d',
  '30d',
  '90d',
] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = '30d';

export const ANALYTICS_RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

/** The `?range=` value, or the default for anything absent or unknown — the same answer the
 *  server page and the client control both read, so they can never disagree about the window. */
export function parseAnalyticsRange(raw: string | string[] | null | undefined): AnalyticsRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (ANALYTICS_RANGES as readonly string[]).includes(value ?? '')
    ? (value as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;
}

export type AnalyticsBucket = '1 hour' | '1 day' | '7 days';

export interface AnalyticsWindow {
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** Monday 00:00 UTC of the week containing `ms`. */
function startOfUtcWeek(ms: number): number {
  const day = startOfUtcDay(ms);
  const sinceMonday = (new Date(day).getUTCDay() + 6) % 7;
  return day - sinceMonday * DAY_MS;
}

function startOfUtcMonth(ms: number, monthOffset = 0): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1);
}

/** ≤ 7 days → hourly, ≤ 90 days → daily, else weekly (ADR 0018 D4). Derived from the range, never
 *  chosen beside it: a second knob could only draw a chart that contradicts the first. */
export function bucketFor(spanMs: number): AnalyticsBucket {
  if (spanMs <= 7 * DAY_MS) return '1 hour';
  if (spanMs <= 90 * DAY_MS) return '1 day';
  return '7 days';
}

/**
 * The half-open window `[from, to)` a range names, in UTC, with weeks starting on Monday.
 *
 * "This week", "this month" and the rolling ranges end at `now`, so their last bucket is partial.
 * The rolling ranges start at a UTC midnight rather than exactly N×24h ago, so a daily bucket is a
 * calendar day and its label means what it says.
 */
export function resolveAnalyticsWindow(range: AnalyticsRange, now: number): AnalyticsWindow {
  let from: number;
  let to = now;
  switch (range) {
    case 'this-week':
      from = startOfUtcWeek(now);
      break;
    case 'last-week':
      to = startOfUtcWeek(now);
      from = to - 7 * DAY_MS;
      break;
    case 'this-month':
      from = startOfUtcMonth(now);
      break;
    case 'last-month':
      to = startOfUtcMonth(now);
      from = startOfUtcMonth(now, -1);
      break;
    case '7d':
      from = startOfUtcDay(now) - 6 * DAY_MS;
      break;
    case '30d':
      from = startOfUtcDay(now) - 29 * DAY_MS;
      break;
    case '90d':
      from = startOfUtcDay(now) - 89 * DAY_MS;
      break;
  }
  // At exactly Monday 00:00 (or the 1st, at midnight) "this week" is empty, and the control plane
  // refuses an empty window rather than guessing one. A minute is the smallest honest window.
  to = Math.max(to, from + MINUTE_MS);
  return { from: new Date(from), to: new Date(to), bucket: bucketFor(to - from) };
}

// ── Response shapes ──────────────────────────────────────────────────────────────────────────────

export interface AnalyticsWindowJson {
  from: string;
  to: string;
}

interface AnalyticsEnvelope {
  repository_id: number | null;
  window: AnalyticsWindowJson;
  /** The equal-length window ending where `window` begins — what every `previous` figure covers. */
  previous_window: AnalyticsWindowJson;
  bucket: string;
}

export interface ReviewTotals {
  runs: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  active: number;
  pending: number;
  p50_duration_secs: number | null;
  p95_duration_secs: number | null;
  reviews: number;
  findings: number;
  inline: number;
  deferred: number;
  out_of_scope: number;
}

export interface ReviewSeriesPoint {
  bucket_start: string;
  runs: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  reviews: number;
  findings: number;
}

export interface KeyCount {
  key: string;
  count: number;
}

export interface RepositoryReviews {
  repository_id: number;
  owner: string;
  name: string;
  platform: string;
  runs: number;
  succeeded: number;
  failed: number;
  reviews: number;
  findings: number;
}

export interface ReviewAnalyticsResponse extends AnalyticsEnvelope {
  current: ReviewTotals;
  previous: ReviewTotals;
  series: ReviewSeriesPoint[];
  by_priority: KeyCount[];
  by_category: KeyCount[];
  by_repository: RepositoryReviews[] | null;
  by_repository_truncated: boolean;
}

export interface FeedbackTotals {
  inline_comments: number;
  reacted_inline: number;
  up: number;
  down: number;
  other: number;
  reactors: number;
  reply_up: number;
  reply_down: number;
  unresolved: number;
  approval_rate: number | null;
}

export interface FeedbackSeriesPoint {
  bucket_start: string;
  inline_comments: number;
  up: number;
  down: number;
}

export interface KeyReactions {
  key: string;
  up: number;
  down: number;
}

export interface DownvotedFinding {
  task_id: string;
  repository_id: number;
  owner: string;
  name: string;
  platform: string;
  target_id: number;
  file: string | null;
  line: number | null;
  title: string | null;
  priority: string | null;
  category: string | null;
  downvotes: number;
}

export interface RepositoryFeedback {
  repository_id: number;
  inline_comments: number;
  up: number;
  down: number;
}

export interface FeedbackAnalyticsResponse extends AnalyticsEnvelope {
  /** Days back the reconciler keeps reactions current; older feedback is frozen. */
  poll_window_days: number;
  current: FeedbackTotals;
  previous: FeedbackTotals;
  series: FeedbackSeriesPoint[];
  by_priority: KeyReactions[];
  by_category: KeyReactions[];
  top_downvoted: DownvotedFinding[];
  by_repository: RepositoryFeedback[] | null;
}

// ── Formatting ───────────────────────────────────────────────────────────────────────────────────

const COUNT_FORMAT = new Intl.NumberFormat('en');
const DAY_LABEL = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}

export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * A window BY DATE — "Aug 25 – Aug 31" — so a delta can be checked against the runs list rather than
 * trusted. The end is stated inclusively: a window ending at a UTC midnight does not contain that
 * day, and printing it would claim a day the figure does not cover.
 */
export function windowLabel(window: AnalyticsWindowJson): string {
  const start = Date.parse(window.from);
  const end = Date.parse(window.to);
  const inclusiveEnd = end % DAY_MS === 0 && end - DAY_MS >= start ? end - DAY_MS : end;
  const from = DAY_LABEL.format(start);
  const to = DAY_LABEL.format(inclusiveEnd);
  return from === to ? from : `${from} – ${to}`;
}

/** A count's change against the previous window, as a percentage. Direction is glyph and wording
 *  only — `StatCard` never colours it — so a rise in failures reads no differently from a rise in
 *  reviews, and the reader decides which one is good. */
export function countDelta(
  current: number,
  previous: number,
  previousWindow: AnalyticsWindowJson
): StatCardDelta {
  const vs = `vs ${windowLabel(previousWindow)}`;
  if (current === previous) return { direction: 'flat', label: `no change ${vs}` };
  if (previous === 0) return { direction: 'up', label: `up from 0 ${vs}` };
  const percent = Math.round(((current - previous) / previous) * 100);
  const direction = current > previous ? 'up' : 'down';
  return { direction, label: `${percent === 0 ? '<1' : Math.abs(percent)}% ${vs}` };
}

/** A rate's change in percentage POINTS — "5 pts", never "12%" of a percentage, which would read
 *  as a much larger move than it is. `undefined` when either side has no rate at all. */
export function rateDelta(
  current: number | null,
  previous: number | null,
  previousWindow: AnalyticsWindowJson
): StatCardDelta | undefined {
  if (current === null || previous === null) return undefined;
  const vs = `vs ${windowLabel(previousWindow)}`;
  const points = Math.round((current - previous) * 100);
  if (points === 0) return { direction: 'flat', label: `no change ${vs}` };
  return { direction: points > 0 ? 'up' : 'down', label: `${Math.abs(points)} pts ${vs}` };
}

// ── The panel list ───────────────────────────────────────────────────────────────────────────────

export type AnalyticsScope = 'estate' | 'repository';
export type AnalyticsSource = 'reviews' | 'feedback';

type ReviewAdapterName =
  | 'reviews'
  | 'findings'
  | 'failedRuns'
  | 'reviewTime'
  | 'runsOverTime'
  | 'findingsByPriority'
  | 'findingsByCategory'
  | 'repositories';

type FeedbackAdapterName =
  'acceptance' | 'coverage' | 'reactionsOverTime' | 'downvotesByCategory' | 'mostDownvoted';

interface PanelSpecBase {
  /** Unique across both pages — the DOM id, the React key, and what a test names. */
  id: string;
  type: DashboardPanelType;
  title: string;
  subtitle?: string;
  span: 1 | 2;
  scopes: readonly AnalyticsScope[];
  /** What a `table` panel says when the window produced no rows. */
  emptyMessage?: string;
}

/**
 * One panel, as data (ADR 0018 D3). `source` names the request it reads — which is also what decides
 * that a failed feedback request costs the feedback panels and nothing else — and `adapter` names a
 * function in the closed registry below, typed per source so a feedback panel cannot name a reviews
 * adapter.
 */
export type AnalyticsPanelSpec =
  | (PanelSpecBase & { source: 'reviews'; adapter: ReviewAdapterName })
  | (PanelSpecBase & { source: 'feedback'; adapter: FeedbackAdapterName });

const EVERYWHERE: readonly AnalyticsScope[] = ['estate', 'repository'];

export const ANALYTICS_PANELS: readonly AnalyticsPanelSpec[] = [
  {
    id: 'reviews',
    type: 'stat',
    title: 'Reviews',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'reviews',
  },
  {
    id: 'findings',
    type: 'stat',
    title: 'Findings',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'findings',
  },
  {
    id: 'acceptance',
    type: 'stat',
    title: 'Acceptance rate',
    span: 1,
    scopes: EVERYWHERE,
    source: 'feedback',
    adapter: 'acceptance',
  },
  {
    id: 'coverage',
    type: 'stat',
    title: 'Comments with a 👍 or 👎',
    span: 1,
    scopes: EVERYWHERE,
    source: 'feedback',
    adapter: 'coverage',
  },
  {
    id: 'failed-runs',
    type: 'stat',
    title: 'Failed runs',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'failedRuns',
  },
  {
    id: 'review-time',
    type: 'stat',
    title: 'Run time (p95)',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'reviewTime',
  },
  {
    id: 'runs-over-time',
    type: 'series',
    title: 'Runs over time',
    subtitle: 'By outcome, bucketed by when each run started.',
    span: 2,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'runsOverTime',
  },
  {
    id: 'findings-by-priority',
    type: 'share',
    title: 'Findings by priority',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'findingsByPriority',
  },
  {
    id: 'findings-by-category',
    type: 'ranked',
    title: 'Findings by category',
    span: 1,
    scopes: EVERYWHERE,
    source: 'reviews',
    adapter: 'findingsByCategory',
  },
  {
    id: 'reactions-over-time',
    type: 'series',
    title: '👍 and 👎 over time',
    subtitle: 'Counted on the comment they were left on, by when that comment was posted.',
    span: 1,
    scopes: EVERYWHERE,
    source: 'feedback',
    adapter: 'reactionsOverTime',
  },
  {
    id: 'downvotes-by-category',
    type: 'ranked',
    title: '👎 by finding category',
    subtitle: 'Findings a reviewer rejected, by what kind of finding they were.',
    span: 1,
    scopes: EVERYWHERE,
    source: 'feedback',
    adapter: 'downvotesByCategory',
  },
  {
    id: 'repositories',
    type: 'table',
    title: 'Repositories',
    subtitle: 'Select a repository for its own insights.',
    span: 2,
    scopes: ['estate'],
    source: 'reviews',
    adapter: 'repositories',
    emptyMessage: 'No repository had a run or a review in this window.',
  },
  {
    id: 'most-downvoted',
    type: 'table',
    title: 'Most down-voted findings',
    subtitle: 'The findings reviewers rejected most, each linked to the run that posted it.',
    span: 2,
    scopes: EVERYWHERE,
    source: 'feedback',
    adapter: 'mostDownvoted',
    emptyMessage: 'No finding was down-voted in this window.',
  },
];

export function panelsFor(scope: AnalyticsScope): AnalyticsPanelSpec[] {
  return ANALYTICS_PANELS.filter((panel) => panel.scopes.includes(scope));
}

// ── Adapters ─────────────────────────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  reviews: ReviewAnalyticsResponse | null;
  feedback: FeedbackAnalyticsResponse | null;
}

/** The per-panel view state the page owns: a series panel's axis scale and a table panel's page. */
export interface AnalyticsUi {
  scaleFor: (panelId: string) => MultiSeriesSpendScale;
  onScaleChange: (panelId: string, scale: MultiSeriesSpendScale) => void;
  pageFor: (panelId: string) => number;
  onPageChange: (panelId: string, page: number) => void;
}

type ReviewAdapter = (
  reviews: ReviewAnalyticsResponse,
  feedback: FeedbackAnalyticsResponse | null,
  ui: AnalyticsUi,
  spec: AnalyticsPanelSpec
) => DashboardPanelView;

type FeedbackAdapter = (
  feedback: FeedbackAnalyticsResponse,
  reviews: ReviewAnalyticsResponse | null,
  ui: AnalyticsUi,
  spec: AnalyticsPanelSpec
) => DashboardPanelView;

const PRIORITIES = ['P0', 'P1', 'P2'] as const;

function line<P extends { bucket_start: string }>(
  key: string,
  label: string,
  points: P[],
  pick: (point: P) => number
): MultiSeriesSpendSeries {
  return {
    key,
    label,
    points: points.map((point) => ({ x: new Date(point.bucket_start), y: pick(point) })),
  };
}

/** A count board. `formatValue`/`formatYTick` are overridden on purpose: the underlying chart
 *  defaults to money, and a `$3` run count is a fabricated unit. */
function countSeries(
  spec: AnalyticsPanelSpec,
  ui: AnalyticsUi,
  lines: MultiSeriesSpendSeries[],
  isEmpty: boolean,
  emptyMessage: string
): DashboardPanelView {
  return {
    kind: 'series',
    series: isEmpty ? [] : lines,
    scale: ui.scaleFor(spec.id),
    onScaleChange: (scale) => ui.onScaleChange(spec.id, scale),
    formatValue: formatCount,
    formatYTick: formatCount,
    emptyMessage,
  };
}

function table(
  spec: AnalyticsPanelSpec,
  ui: AnalyticsUi,
  columns: DashboardTableColumn[],
  rows: DashboardTableRow[],
  unit: string
): DashboardPanelView {
  const page = ui.pageFor(spec.id);
  return {
    kind: 'table',
    columns,
    rows,
    unit,
    page,
    total: rows.length,
    onPrev: () => ui.onPageChange(spec.id, page - 1),
    onNext: () => ui.onPageChange(spec.id, page + 1),
  };
}

const REPOSITORY_COLUMNS: DashboardTableColumn[] = [
  { key: 'repository', header: 'Repository', kind: 'text' },
  { key: 'runs', header: 'Runs', align: 'right', kind: 'data' },
  { key: 'failed', header: 'Failed', align: 'right', kind: 'data' },
  { key: 'reviews', header: 'Reviews', align: 'right', kind: 'data' },
  { key: 'findings', header: 'Findings', align: 'right', kind: 'data' },
  { key: 'up', header: '👍', align: 'right', kind: 'data' },
  { key: 'down', header: '👎', align: 'right', kind: 'data' },
];

const REVIEW_ADAPTERS: Record<ReviewAdapterName, ReviewAdapter> = {
  reviews: (reviews, _feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(reviews.current.reviews),
    delta: countDelta(reviews.current.reviews, reviews.previous.reviews, reviews.previous_window),
    sparkline: reviews.series.map((point) => point.reviews),
  }),
  findings: (reviews, _feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(reviews.current.findings),
    delta: countDelta(reviews.current.findings, reviews.previous.findings, reviews.previous_window),
    sparkline: reviews.series.map((point) => point.findings),
  }),
  failedRuns: (reviews, _feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(reviews.current.failed),
    delta: countDelta(reviews.current.failed, reviews.previous.failed, reviews.previous_window),
    sparkline: reviews.series.map((point) => point.failed),
  }),
  reviewTime: (reviews, _feedback, _ui, spec) => {
    const current = reviews.current.p95_duration_secs;
    const previous = reviews.previous.p95_duration_secs;
    return {
      kind: 'stat',
      label: spec.title,
      metric: formatDuration(current),
      delta:
        current === null || previous === null
          ? undefined
          : countDelta(Math.round(current), Math.round(previous), reviews.previous_window),
    };
  },
  runsOverTime: (reviews, _feedback, ui, spec) =>
    countSeries(
      spec,
      ui,
      [
        line('succeeded', 'Succeeded', reviews.series, (point) => point.succeeded),
        line('failed', 'Failed', reviews.series, (point) => point.failed),
        line('cancelled', 'Cancelled', reviews.series, (point) => point.cancelled),
      ],
      reviews.current.runs === 0,
      'No runs in this window.'
    ),
  findingsByPriority: (reviews) => ({
    kind: 'share',
    // A fixed P0 → P2 order rather than by size: severity is the reading, and a bar whose segments
    // reorder with the data would move P0 around under the reader.
    segments: PRIORITIES.map((key) => {
      const count = reviews.by_priority.find((entry) => entry.key === key)?.count ?? 0;
      return { key, label: key, value: count, formattedValue: formatCount(count) };
    }).filter((segment) => segment.value > 0),
    emptyMessage: 'No findings in this window.',
  }),
  findingsByCategory: (reviews) => ({
    kind: 'ranked',
    rows: reviews.by_category.map((entry) => ({
      key: entry.key,
      label: entry.key,
      value: entry.count,
      formattedValue: formatCount(entry.count),
    })),
    emptyMessage: 'No findings in this window.',
  }),
  repositories: (reviews, feedback, ui, spec) => {
    const feedbackByRepository = new Map(
      (feedback?.by_repository ?? []).map((row) => [row.repository_id, row])
    );
    // With the feedback request failed, the reaction columns say "—" (unknown) rather than "0".
    const reaction = (value: number | undefined) =>
      feedback === null ? '—' : formatCount(value ?? 0);
    const rows = (reviews.by_repository ?? []).map((repository) => {
      const reactions = feedbackByRepository.get(repository.repository_id);
      return {
        key: String(repository.repository_id),
        href: `/repositories/${repository.repository_id}/insights`,
        cells: {
          repository: `${repository.owner}/${repository.name}`,
          runs: formatCount(repository.runs),
          failed: formatCount(repository.failed),
          reviews: formatCount(repository.reviews),
          findings: formatCount(repository.findings),
          up: reaction(reactions?.up),
          down: reaction(reactions?.down),
        },
      };
    });
    return table(spec, ui, REPOSITORY_COLUMNS, rows, 'repositories');
  },
};

const FEEDBACK_ADAPTERS: Record<FeedbackAdapterName, FeedbackAdapter> = {
  // The rate is the control plane's `up / (up + down)` — never recomputed here over every reaction,
  // which would let a ❤️ dilute it.
  acceptance: (feedback, _reviews, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatRate(feedback.current.approval_rate),
    delta: rateDelta(
      feedback.current.approval_rate,
      feedback.previous.approval_rate,
      feedback.previous_window
    ),
  }),
  // Coverage sits beside the rate as its own card, so a 100% built on two reactions reads as two
  // reactions (ADR 0018 D5, rule 4).
  coverage: (feedback, _reviews, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: `${formatCount(feedback.current.reacted_inline)} of ${formatCount(feedback.current.inline_comments)}`,
  }),
  reactionsOverTime: (feedback, _reviews, ui, spec) =>
    countSeries(
      spec,
      ui,
      [
        line('up', 'Thumbs up', feedback.series, (point) => point.up),
        line('down', 'Thumbs down', feedback.series, (point) => point.down),
      ],
      feedback.current.inline_comments === 0,
      'No review comments were posted in this window.'
    ),
  downvotesByCategory: (feedback) => ({
    kind: 'ranked',
    rows: feedback.by_category
      .filter((entry) => entry.down > 0)
      .sort((a, b) => b.down - a.down || b.up - a.up)
      .map((entry) => ({
        key: entry.key,
        label: entry.key,
        value: entry.down,
        formattedValue: `${formatCount(entry.down)} 👎 · ${formatCount(entry.up)} 👍`,
      })),
    emptyMessage: 'No matched finding was down-voted in this window.',
  }),
  mostDownvoted: (feedback, _reviews, ui, spec) => {
    const estate = feedback.repository_id === null;
    const columns: DashboardTableColumn[] = [
      ...(estate ? [{ key: 'repository', header: 'Repository', kind: 'text' as const }] : []),
      { key: 'finding', header: 'Finding', kind: 'text' },
      { key: 'location', header: 'Location', kind: 'data' },
      { key: 'priority', header: 'Priority', kind: 'data' },
      { key: 'category', header: 'Category', kind: 'text' },
      { key: 'downvotes', header: '👎', align: 'right', kind: 'data' },
    ];
    const rows = feedback.top_downvoted.map((finding, index) => ({
      key: `${index}-${finding.task_id}`,
      href: `/runs/${finding.task_id}`,
      cells: {
        repository: `${finding.owner}/${finding.name}`,
        // A comment the control plane could not match to a finding keeps its row — dropping it would
        // hide a real rejection — but it has no title to show, and says so.
        finding: finding.title ?? 'Unmatched comment',
        location:
          finding.file === null
            ? '—'
            : finding.line === null
              ? finding.file
              : `${finding.file}:${finding.line}`,
        priority: finding.priority ?? '—',
        category: finding.category ?? '—',
        downvotes: formatCount(finding.downvotes),
      },
    }));
    return table(spec, ui, columns, rows, 'findings');
  },
};

/** The render-ready view for one panel, or `null` when the request it reads did not succeed. */
export function analyticsView(
  spec: AnalyticsPanelSpec,
  data: AnalyticsData,
  ui: AnalyticsUi
): DashboardPanelView | null {
  if (spec.source === 'reviews') {
    return data.reviews
      ? REVIEW_ADAPTERS[spec.adapter](data.reviews, data.feedback, ui, spec)
      : null;
  }
  return data.feedback
    ? FEEDBACK_ADAPTERS[spec.adapter](data.feedback, data.reviews, ui, spec)
    : null;
}

/**
 * The page-level caveats a feedback response carries, as sentences (ADR 0018 D5). Stated once above
 * the grid rather than on a panel, because both headline feedback figures are bare stat cards with no
 * caption row of their own.
 */
export function feedbackNotes(feedback: FeedbackAnalyticsResponse, now: number): string[] {
  const notes: string[] = [];
  const refreshedFrom = now - feedback.poll_window_days * DAY_MS;
  if (Date.parse(feedback.window.from) < refreshedFrom) {
    notes.push(
      `👍/👎 on comments posted before ${DAY_LABEL.format(refreshedFrom)} are no longer refreshed — ` +
        `reactions are kept current for ${feedback.poll_window_days} days after a review.`
    );
  }
  if (feedback.current.unresolved > 0) {
    const count = feedback.current.unresolved;
    notes.push(
      `${formatCount(count)} ${count === 1 ? 'reaction is' : 'reactions are'} on a comment that ` +
        `matched no finding: counted in the acceptance rate, but not by priority or category.`
    );
  }
  return notes;
}
