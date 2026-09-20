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
 * Reviewer feedback for the Feedback page and a repository's Feedback tab (LCI ADR-0116): the range
 * vocabulary, the shape `GET /analytics/feedback` returns, the declarative panel list, and the
 * adapters that turn a response into render-ready `DashboardPanelView`s for `ui-web`'s panel kit.
 *
 * Nothing here aggregates rows. Every figure is read off an aggregate the control plane computed
 * for exactly the window the page asked for; the adapters only format, order and caption.
 */

// ── Range ────────────────────────────────────────────────────────────────────────────────────────

export const FEEDBACK_RANGES = [
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  '7d',
  '30d',
  '90d',
] as const;
export type FeedbackRange = (typeof FEEDBACK_RANGES)[number];
export const DEFAULT_FEEDBACK_RANGE: FeedbackRange = '30d';

export const FEEDBACK_RANGE_OPTIONS: { value: FeedbackRange; label: string }[] = [
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
export function parseFeedbackRange(raw: string | string[] | null | undefined): FeedbackRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (FEEDBACK_RANGES as readonly string[]).includes(value ?? '')
    ? (value as FeedbackRange)
    : DEFAULT_FEEDBACK_RANGE;
}

export type FeedbackBucket = '1 hour' | '1 day' | '7 days';

export interface FeedbackWindow {
  from: Date;
  to: Date;
  bucket: FeedbackBucket;
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

/** ≤ 7 days → hourly, ≤ 90 days → daily, else weekly (LCI ADR-0116 D4). Derived from the range,
 *  never chosen beside it: a second knob could only draw a chart that contradicts the first. */
export function bucketFor(spanMs: number): FeedbackBucket {
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
export function resolveFeedbackWindow(range: FeedbackRange, now: number): FeedbackWindow {
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

// ── Response shape ───────────────────────────────────────────────────────────────────────────────

export interface WindowJson {
  from: string;
  to: string;
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
  approval_rate: number | null;
}

export interface FeedbackSeriesPoint {
  bucket_start: string;
  inline_comments: number;
  up: number;
  down: number;
}

export interface RepositoryFeedback {
  repository_id: number;
  owner: string;
  name: string;
  platform: string;
  inline_comments: number;
  up: number;
  down: number;
  approval_rate: number | null;
}

export interface FeedbackAnalyticsResponse {
  repository_id: number | null;
  window: WindowJson;
  /** The equal-length window ending where `window` begins — what every `previous` figure covers. */
  previous_window: WindowJson;
  bucket: string;
  /** Days back the reconciler keeps reactions current; older feedback is frozen. */
  poll_window_days: number;
  current: FeedbackTotals;
  previous: FeedbackTotals;
  series: FeedbackSeriesPoint[];
  by_repository: RepositoryFeedback[] | null;
  by_repository_truncated: boolean;
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

/**
 * A window BY DATE — "Aug 25 – Aug 31" — so a delta can be checked against the runs list rather than
 * trusted. The end is stated inclusively: a window ending at a UTC midnight does not contain that
 * day, and printing it would claim a day the figure does not cover.
 */
export function windowLabel(window: WindowJson): string {
  const start = Date.parse(window.from);
  const end = Date.parse(window.to);
  const inclusiveEnd = end % DAY_MS === 0 && end - DAY_MS >= start ? end - DAY_MS : end;
  const from = DAY_LABEL.format(start);
  const to = DAY_LABEL.format(inclusiveEnd);
  return from === to ? from : `${from} – ${to}`;
}

/** A count's change against the previous window, as a percentage. Direction is glyph and wording
 *  only — `StatCard` never colours it — so a rise in 👎 reads no differently from a rise in 👍, and
 *  the reader decides which one is good. */
export function countDelta(
  current: number,
  previous: number,
  previousWindow: WindowJson
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
  previousWindow: WindowJson
): StatCardDelta | undefined {
  if (current === null || previous === null) return undefined;
  const vs = `vs ${windowLabel(previousWindow)}`;
  const points = Math.round((current - previous) * 100);
  if (points === 0) return { direction: 'flat', label: `no change ${vs}` };
  return { direction: points > 0 ? 'up' : 'down', label: `${Math.abs(points)} pts ${vs}` };
}

// ── The panel list ───────────────────────────────────────────────────────────────────────────────

export type FeedbackScope = 'estate' | 'repository';

type FeedbackAdapterName =
  | 'acceptance'
  | 'coverage'
  | 'thumbsUp'
  | 'thumbsDown'
  | 'reactors'
  | 'reactionsOverTime'
  | 'reactionMix'
  | 'mostRejected'
  | 'repositories';

/**
 * One panel, as data (LCI ADR-0116 D3). `adapter` names a function in the closed registry below, so
 * a panel can only be declared if something can actually render it.
 */
export interface FeedbackPanelSpec {
  /** Unique across both pages — the DOM id, the React key, and what a test names. */
  id: string;
  type: DashboardPanelType;
  title: string;
  subtitle?: string;
  span: 1 | 2;
  scopes: readonly FeedbackScope[];
  adapter: FeedbackAdapterName;
  /** What a `table` panel says when the window produced no rows. */
  emptyMessage?: string;
}

const EVERYWHERE: readonly FeedbackScope[] = ['estate', 'repository'];
const ESTATE_ONLY: readonly FeedbackScope[] = ['estate'];

export const FEEDBACK_PANELS: readonly FeedbackPanelSpec[] = [
  {
    id: 'acceptance',
    type: 'stat',
    title: 'Acceptance rate',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'acceptance',
  },
  {
    id: 'coverage',
    type: 'stat',
    title: 'Comments with a 👍 or 👎',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'coverage',
  },
  {
    id: 'thumbs-up',
    type: 'stat',
    title: '👍',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'thumbsUp',
  },
  {
    id: 'thumbs-down',
    type: 'stat',
    title: '👎',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'thumbsDown',
  },
  {
    id: 'reactors',
    type: 'stat',
    title: 'People who reacted',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'reactors',
  },
  {
    id: 'reactions-over-time',
    type: 'series',
    title: '👍 and 👎 over time',
    subtitle: 'Counted on the comment they were left on, by when that comment was posted.',
    span: 2,
    scopes: EVERYWHERE,
    adapter: 'reactionsOverTime',
  },
  {
    id: 'reaction-mix',
    type: 'share',
    title: 'Every reaction',
    subtitle: 'Only 👍 and 👎 count towards the rate.',
    span: 1,
    scopes: EVERYWHERE,
    adapter: 'reactionMix',
  },
  {
    id: 'most-rejected',
    type: 'ranked',
    title: 'Most 👎 by repository',
    span: 1,
    scopes: ESTATE_ONLY,
    adapter: 'mostRejected',
  },
  {
    id: 'repositories',
    type: 'table',
    title: 'Repositories',
    subtitle: 'Select a repository for its own feedback.',
    span: 2,
    scopes: ESTATE_ONLY,
    adapter: 'repositories',
    emptyMessage: 'No repository had a review comment in this window.',
  },
];

export function panelsFor(scope: FeedbackScope): FeedbackPanelSpec[] {
  return FEEDBACK_PANELS.filter((panel) => panel.scopes.includes(scope));
}

// ── Adapters ─────────────────────────────────────────────────────────────────────────────────────

/** The per-panel view state the page owns: a series panel's axis scale and a table panel's page. */
export interface FeedbackUi {
  scaleFor: (panelId: string) => MultiSeriesSpendScale;
  onScaleChange: (panelId: string, scale: MultiSeriesSpendScale) => void;
  pageFor: (panelId: string) => number;
  onPageChange: (panelId: string, page: number) => void;
}

type FeedbackAdapter = (
  feedback: FeedbackAnalyticsResponse,
  ui: FeedbackUi,
  spec: FeedbackPanelSpec
) => DashboardPanelView;

function line(
  key: string,
  label: string,
  points: FeedbackSeriesPoint[],
  pick: (point: FeedbackSeriesPoint) => number
): MultiSeriesSpendSeries {
  return {
    key,
    label,
    points: points.map((point) => ({ x: new Date(point.bucket_start), y: pick(point) })),
  };
}

/** A count board. `formatValue`/`formatYTick` are overridden on purpose: the underlying chart
 *  defaults to money, and a `$3` reaction count is a fabricated unit. */
function countSeries(
  spec: FeedbackPanelSpec,
  ui: FeedbackUi,
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
  spec: FeedbackPanelSpec,
  ui: FeedbackUi,
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
  { key: 'comments', header: 'Comments', align: 'right', kind: 'data' },
  { key: 'up', header: '👍', align: 'right', kind: 'data' },
  { key: 'down', header: '👎', align: 'right', kind: 'data' },
  { key: 'rate', header: 'Accepted', align: 'right', kind: 'data' },
];

const FEEDBACK_ADAPTERS: Record<FeedbackAdapterName, FeedbackAdapter> = {
  // The rate is the control plane's `up / (up + down)` — never recomputed here over every reaction,
  // which would let a ❤️ dilute it.
  acceptance: (feedback, _ui, spec) => ({
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
  // reactions (LCI ADR-0116 D5, rule 4).
  coverage: (feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: `${formatCount(feedback.current.reacted_inline)} of ${formatCount(feedback.current.inline_comments)}`,
  }),
  thumbsUp: (feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(feedback.current.up),
    delta: countDelta(feedback.current.up, feedback.previous.up, feedback.previous_window),
    sparkline: feedback.series.map((point) => point.up),
  }),
  thumbsDown: (feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(feedback.current.down),
    delta: countDelta(feedback.current.down, feedback.previous.down, feedback.previous_window),
    sparkline: feedback.series.map((point) => point.down),
  }),
  reactors: (feedback, _ui, spec) => ({
    kind: 'stat',
    label: spec.title,
    metric: formatCount(feedback.current.reactors),
    delta: countDelta(
      feedback.current.reactors,
      feedback.previous.reactors,
      feedback.previous_window
    ),
  }),
  reactionsOverTime: (feedback, ui, spec) =>
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
  // Every reaction the forge allows, in one bar: what the rate is built on, and what it ignores.
  reactionMix: (feedback) => {
    const { up, down, other } = feedback.current;
    return {
      kind: 'share',
      segments: [
        { key: 'up', label: '👍', value: up, formattedValue: formatCount(up) },
        { key: 'down', label: '👎', value: down, formattedValue: formatCount(down) },
        { key: 'other', label: 'Other', value: other, formattedValue: formatCount(other) },
      ].filter((segment) => segment.value > 0),
      emptyMessage: 'Nobody reacted in this window.',
    };
  },
  mostRejected: (feedback) => ({
    kind: 'ranked',
    rows: (feedback.by_repository ?? [])
      .filter((repository) => repository.down > 0)
      .sort((a, b) => b.down - a.down || b.up - a.up)
      .map((repository) => ({
        key: String(repository.repository_id),
        label: `${repository.owner}/${repository.name}`,
        value: repository.down,
        formattedValue: `${formatCount(repository.down)} 👎 · ${formatCount(repository.up)} 👍`,
      })),
    emptyMessage: 'No review comment was down-voted in this window.',
  }),
  repositories: (feedback, ui, spec) => {
    const rows = (feedback.by_repository ?? []).map((repository) => ({
      key: String(repository.repository_id),
      href: `/repositories/${repository.repository_id}/feedback`,
      cells: {
        repository: `${repository.owner}/${repository.name}`,
        comments: formatCount(repository.inline_comments),
        up: formatCount(repository.up),
        down: formatCount(repository.down),
        rate: formatRate(repository.approval_rate),
      },
    }));
    return table(spec, ui, REPOSITORY_COLUMNS, rows, 'repositories');
  },
};

/** The render-ready view for one panel, or `null` when the request it reads did not succeed. */
export function feedbackView(
  spec: FeedbackPanelSpec,
  feedback: FeedbackAnalyticsResponse | null,
  ui: FeedbackUi
): DashboardPanelView | null {
  return feedback ? FEEDBACK_ADAPTERS[spec.adapter](feedback, ui, spec) : null;
}

/**
 * The page-level caveats a response carries, as sentences (LCI ADR-0116 D5). Stated once above the
 * grid rather than on a panel, because the headline figures are bare stat cards with no caption row
 * of their own.
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
  if (feedback.by_repository_truncated) {
    notes.push(
      `Only the ${formatCount(feedback.by_repository?.length ?? 0)} most down-voted repositories ` +
        `are listed; the estate has more with feedback in this window.`
    );
  }
  const reply = feedback.current.reply_up + feedback.current.reply_down;
  if (reply > 0) {
    notes.push(
      `${formatCount(reply)} ${reply === 1 ? 'reaction' : 'reactions'} on summary comments ` +
        `${reply === 1 ? 'is' : 'are'} not counted above: a 👍 on "here is my summary" is not a ` +
        `verdict on any one finding.`
    );
  }
  return notes;
}
