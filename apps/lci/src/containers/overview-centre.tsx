import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { Sparkline } from '@lightbridge/ui-web/src/components/sparkline';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { LABEL_CLASS, META_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';

import {
  breakdownByOutcome,
  breakdownByRepo,
  computeKpis,
  formatSeconds,
  runsPerDay,
  type Slice,
} from '../lib/domain/insights';
import { relativeTime, repoLabel, statusTone, triggerLabel, type Task } from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';

/**
 * Overview: task-run activity across every connected repository — totals, pass rate, typical
 * duration, active runs, a 14-day trend, and breakdowns by repository and outcome.
 *
 * The breakdown rows are a plain label/count list with a relative-width bar, not `Meter` —
 * `Meter` is a budget-consumption primitive with a hardcoded "$X of $Y" caption, not a generic
 * progress control; using it here would print a dollar sign in front of a run count.
 */
export function OverviewCentre({ result, now }: { result: ApiResult<Task[]>; now: number }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" subtitle="Task runs across your connected repositories." />

      {!result.ok ? (
        <Card>
          <ErrorLine
            message={
              result.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : result.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load runs${result.status ? ` (HTTP ${result.status})` : ''}.`
            }
          />
        </Card>
      ) : (
        <OverviewInsights tasks={result.data} now={now} />
      )}
    </div>
  );
}

function OverviewInsights({ tasks, now }: { tasks: Task[]; now: number }) {
  const kpis = computeKpis(tasks, now);
  const series = runsPerDay(tasks, now, 14);
  const byRepo = breakdownByRepo(tasks);
  const byOutcome = breakdownByOutcome(tasks);

  return (
    <div className="flex flex-col gap-6">
      <OverviewStatRow
        cards={[
          { key: 'total', label: 'Total runs', metric: String(kpis.total) },
          {
            key: 'pass-rate',
            label: 'Pass rate',
            metric: kpis.passRate === null ? '—' : `${Math.round(kpis.passRate * 100)}%`,
          },
          {
            key: 'p50',
            label: 'p50 duration',
            metric: kpis.p50Seconds === null ? '—' : formatSeconds(kpis.p50Seconds),
          },
          { key: 'active', label: 'Active', metric: String(kpis.active) },
        ]}
      />

      <Card title="Runs over time" actions={<span className={META_CLASS}>last 14 days</span>}>
        <RunsOverTime series={series} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="By repository">
          <BreakdownList slices={byRepo} emptyMessage="No runs yet." />
        </Card>
        <Card title="By outcome">
          <BreakdownList slices={byOutcome} emptyMessage="No runs yet." />
        </Card>
      </div>

      <Card
        title="Recent runs"
        actions={
          <Link href="/runs" className={`${META_CLASS} hover:underline`}>
            View all
          </Link>
        }>
        <RecentRuns tasks={tasks} now={now} />
      </Card>
    </div>
  );
}

/** The last 8 runs, most recent first. `tasks` already arrives sorted newest-first from
 *  `listTasks()` — this only takes the head.
 *
 *  A glance list, not a data table: branch/SHA/duration are dropped in favour of one quiet meta
 *  line, since the run detail page's own Overview card is where those actually live now. */
function RecentRuns({ tasks, now }: { tasks: Task[]; now: number }) {
  if (tasks.length === 0) {
    return <InlineStatus>No task runs yet.</InlineStatus>;
  }
  return (
    <ul className="divide-border flex flex-col divide-y">
      {tasks.slice(0, 8).map((task) => {
        const { tone, label } = statusTone(task.status);
        return (
          <li key={task.id}>
            <Link
              href={`/runs/${task.id}`}
              className="hover:bg-raised -mx-4 flex items-center gap-4 px-4 py-4 first:pt-0 last:pb-0">
              <span className="w-24 shrink-0">
                <StatusText tone={tone}>{label}</StatusText>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{triggerLabel(task)}</span>
                <span className={`${META_CLASS} mt-1 block truncate`}>{repoLabel(task)}</span>
              </span>
              <span className={`${META_CLASS} hidden shrink-0 text-right sm:block`}>
                {relativeTime(task.created_at, now)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function RunsOverTime({ series }: { series: ReturnType<typeof runsPerDay> }) {
  const total = series.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...series.map((d) => d.count));
  const first = series.at(0);
  const last = series.at(-1);

  if (total === 0) {
    return <InlineStatus>No runs in the last 14 days.</InlineStatus>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Sparkline data={series.map((d) => d.count)} width={640} height={96} />
      <div className={`flex items-center justify-between ${META_CLASS}`}>
        <span>{first?.label}</span>
        <span>
          {total} run{total === 1 ? '' : 's'} · peak {max}/day
        </span>
        <span>{last?.label}</span>
      </div>
    </div>
  );
}

function BreakdownList({ slices, emptyMessage }: { slices: Slice[]; emptyMessage: string }) {
  if (slices.length === 0) {
    return <InlineStatus>{emptyMessage}</InlineStatus>;
  }
  const max = Math.max(1, ...slices.map((s) => s.count));

  return (
    <ul className="flex flex-col gap-2.5">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center gap-3">
          <span className={`w-40 shrink-0 truncate ${LABEL_CLASS}`}>{s.label}</span>
          <span className="bg-raised h-1.5 flex-1 overflow-hidden rounded-none">
            <span
              className="bg-soft block h-full"
              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums">{s.count}</span>
        </li>
      ))}
    </ul>
  );
}
