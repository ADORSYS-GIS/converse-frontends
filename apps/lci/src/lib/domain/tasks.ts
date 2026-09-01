/**
 * Task-run domain types + presentation logic. Mirrors the control plane's `/tasks` payload
 * (`TaskRow` in `services/control-plane/src/db.rs`). Pure + Edge-safe.
 *
 * `statusTone` maps a run's status onto `StatusText`'s three tones (`active`/`muted`/`attention`)
 * rather than a wider good/bad palette — colour is never used to say a run's outcome was "good"
 * or "bad", only whether it needs attention. A completed run reads as `active` (plain, nothing to
 * do), not a distinct "success" colour.
 */

export const RUNS_PAGE_SIZE = 25;

export interface Task {
  id: string;
  repository_id: number;
  installation_id: number;
  webhook_delivery_id: string | null;
  target_type: string;
  target_id: number;
  command_text: string;
  base_sha: string | null;
  head_sha: string | null;
  status: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  repo_default_branch: string | null;
  repo_platform: 'github' | 'gitlab' | null;
  job_name: string | null;
  error_detail: string | null;
}

/** One finding from the agent's review (mirrors `review::Finding`). */
export interface ReviewFinding {
  file: string;
  line: number;
  /** Triage priority `P0`|`P1`|`P2`. Optional for rows that predate the priority model. */
  priority?: string;
  /** Dimension: `security`|`correctness`|`quality`|`style`|`performance`. */
  category?: string;
  /** Legacy `error`|`warning`|`info` level. Read-only fallback for old rows. */
  severity?: string;
  title: string;
  body: string;
  suggestion?: string | null;
  resources?: string[];
}

/** A persisted review (`GET /tasks/{id}/review`). */
export interface Review {
  task_id: string;
  summary: string;
  body: string;
  inline_count: number;
  deferred_count: number;
  out_of_scope_count: number;
  findings: ReviewFinding[];
  review_url: string | null;
  created_at: string;
}

/** Failure-banner label, matched to what the task actually attempted: indexing vs. review. */
export function failureNoticePrefix(task: Task): string {
  return task.target_type === 'repository' ? 'Indexing failed' : 'Review did not post';
}

export type StatusTone = 'active' | 'muted' | 'attention';

/** A five-way outcome classification, kept separate from `statusTone` (display) because KPI
 *  aggregation (`insights.ts`'s `computeKpis`) genuinely needs to distinguish "succeeded" from
 *  "failed" — a distinction `StatusText`'s three tones deliberately collapse for display, since
 *  no colour there encodes good/bad. */
export type StatusOutcome = 'pending' | 'active' | 'success' | 'error' | 'muted';

export function statusOutcome(status: string): StatusOutcome {
  switch (status) {
    case 'received':
    case 'waiting_for_index':
    case 'queued':
      return 'pending';
    case 'running':
    case 'posting_result':
      return 'active';
    case 'succeeded':
      return 'success';
    case 'failed':
    case 'timed_out':
      return 'error';
    case 'cancelled':
      return 'muted';
    default:
      return 'pending';
  }
}

/** Map a raw `TaskStatus` string (snake_case from the DB) to a `StatusText` tone + label. */
export function statusTone(status: string): { tone: StatusTone; label: string } {
  switch (status) {
    case 'received':
      return { tone: 'muted', label: 'Received' };
    case 'waiting_for_index':
      return { tone: 'muted', label: 'Waiting for index' };
    case 'queued':
      return { tone: 'muted', label: 'Queued' };
    case 'running':
      return { tone: 'active', label: 'Running' };
    case 'posting_result':
      return { tone: 'active', label: 'Posting result' };
    case 'succeeded':
      return { tone: 'active', label: 'Succeeded' };
    case 'failed':
      return { tone: 'attention', label: 'Failed' };
    case 'timed_out':
      return { tone: 'attention', label: 'Timed out' };
    case 'cancelled':
      return { tone: 'muted', label: 'Cancelled' };
    default:
      return { tone: 'muted', label: status };
  }
}

/** Human repo slug (`owner/name`), or a stable fallback when the join came back empty. */
export function repoLabel(task: Task): string {
  if (task.repo_owner && task.repo_name) return `${task.repo_owner}/${task.repo_name}`;
  return `repo #${task.repository_id}`;
}

/** What triggered the run, e.g. `review · PR #123` (GitHub) or `review · MR #15` (GitLab). */
export function triggerLabel(task: Task): string {
  const target =
    task.target_type === 'pull_request'
      ? task.repo_platform === 'gitlab'
        ? `MR #${task.target_id}`
        : `PR #${task.target_id}`
      : `${task.target_type} #${task.target_id}`;
  return `${task.command_text} · ${target}`;
}

export function shortSha(sha: string | null): string | null {
  return sha ? sha.slice(0, 7) : null;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 minutes ago" from an ISO timestamp, relative to `now` (defaults to current time). */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 'unknown time';
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (abs >= secondsInUnit || unit === 'second') {
      return RELATIVE_TIME_FORMATTER.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return RELATIVE_TIME_FORMATTER.format(0, 'second');
}

const ABSOLUTE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Absolute timestamp for tooltips/detail rows. */
export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return ABSOLUTE_TIME_FORMATTER.format(date);
}

export function durationSeconds(task: Task, now: number = Date.now()): number | null {
  if (!task.started_at) return null;
  const start = new Date(task.started_at).getTime();
  const end = task.completed_at ? new Date(task.completed_at).getTime() : now;
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function duration(task: Task, now: number = Date.now()): string | null {
  const seconds = durationSeconds(task, now);
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
