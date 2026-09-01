import { durationSeconds, statusOutcome, type Task } from './tasks';

/**
 * Overview KPI aggregation — pure functions over the already-fetched task list, ported from
 * `lightbridge-code-intelligence/apps/web/lib/domain/insights.ts`, trimmed to what the Overview
 * screen's stat-card row uses (the runs-over-time sparkline and by-repo/by-outcome breakdowns
 * port the same way once that part of the screen is built).
 */
export interface Kpis {
  total: number;
  /** Succeeded / (succeeded + failed), or `null` when nothing has completed. */
  passRate: number | null;
  /** Median duration in seconds over completed runs, or `null`. */
  p50Seconds: number | null;
  active: number;
}

export function computeKpis(tasks: Task[], now: number): Kpis {
  let success = 0;
  let completed = 0;
  let active = 0;
  const durations: number[] = [];
  for (const t of tasks) {
    const outcome = statusOutcome(t.status);
    if (outcome === 'active') active++;
    if (outcome === 'success' || outcome === 'error') {
      completed++;
      if (outcome === 'success') success++;
      const d = durationSeconds(t, now);
      if (d !== null) durations.push(d);
    }
  }
  return {
    total: tasks.length,
    passRate: completed ? success / completed : null,
    p50Seconds: durations.length ? median(durations) : null,
    active,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  if (sorted.length % 2) return hi;
  const lo = sorted[mid - 1] ?? hi;
  return Math.round((lo + hi) / 2);
}

/** Compact duration label from seconds (mirrors `duration` in `tasks.ts`, but from a number). */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
