import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { DATA_CLASS, LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';

import {
  absoluteTime,
  duration,
  relativeTime,
  repoLabel,
  shortSha,
  statusTone,
  triggerLabel,
  type Review,
  type Task,
} from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';
import { Fact } from './fact';
import { GrafanaPanel } from './grafana-panel';
import { ReviewOutput } from './review-output';

/**
 * Run detail: status, trigger, the persisted review, and this run's logs — live from Grafana/Loki
 * when `NEXT_PUBLIC_GRAFANA_URL` is set, always available as a `kubectl logs` command either way.
 *
 * The outcome badge is a `PageControls` row on the floor, not `PageHeader.controls` — that slot is
 * gone (owner directive 2026-09-03, "filters are outside cards"; ADR 0015 amendment A2), and the
 * title row now carries a title, a subtitle and at most one action. It is deliberately NOT folded
 * into the subtitle string beside the repository and the timings: `StatusText` carries a TONE, and
 * "Failed" rendered as one more grey fragment in a `·`-joined line is the single fact on this
 * screen that must not read like the rest.
 *
 * A row holding one readout and no knob is the honest shape here — this screen has no parameters
 * at all, and `label` says what the row is rather than pretending it filters something.
 */
export function RunDetailCentre({
  taskResult,
  reviewResult,
  now,
  grafanaBaseUrl,
}: {
  taskResult: ApiResult<Task | null>;
  reviewResult: ApiResult<Review | null> | null;
  now: number;
  grafanaBaseUrl: string | null;
}) {
  if (!taskResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Run" />
        <Card>
          <ErrorLine
            message={
              taskResult.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : taskResult.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load this run${taskResult.status ? ` (HTTP ${taskResult.status})` : ''}.`
            }
          />
        </Card>
      </div>
    );
  }
  const task = taskResult.data;
  if (!task || !reviewResult) return null;

  const { tone, label } = statusTone(task.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={triggerLabel(task)}
        subtitle={`${repoLabel(task)} · ${relativeTime(task.created_at, now)}${duration(task, now) ? ` · ${duration(task, now)}` : ''}`}
      />

      <PageControls
        label="Run status"
        groups={[
          {
            id: 'outcome',
            // `end`, like `RepositoryShell`'s approval group: the outcome keeps the trailing edge
            // it read from before `PageHeader.controls` was deleted, so the eye still finds the
            // run's verdict where it has always been rather than as an orphan word under the
            // subtitle.
            align: 'end',
            label: 'Outcome',
            children: <StatusText tone={tone}>{label}</StatusText>,
          },
        ]}
      />

      <Card title="Overview">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Repository">
            <Link
              href={`/repositories/${task.repository_id}`}
              className="text-primary hover:underline">
              {repoLabel(task)}
            </Link>
          </Fact>
          <Fact label="Branch">{task.repo_default_branch ?? '—'}</Fact>
          <Fact label="Trigger">{triggerLabel(task)}</Fact>
          <Fact label="Delivery">
            <code className="bg-chrome rounded-field px-1.5 py-0.5 font-mono">
              {task.webhook_delivery_id ?? '—'}
            </code>
          </Fact>
          <Fact label="Base SHA">
            <code className="bg-chrome rounded-field px-1.5 py-0.5 font-mono">
              {shortSha(task.base_sha) ?? '—'}
            </code>
          </Fact>
          <Fact label="Head SHA">
            <code className="bg-chrome rounded-field px-1.5 py-0.5 font-mono">
              {shortSha(task.head_sha) ?? '—'}
            </code>
          </Fact>
          <Fact label="Created">{absoluteTime(task.created_at)}</Fact>
          <Fact label="Started">{task.started_at ? absoluteTime(task.started_at) : '—'}</Fact>
          <Fact label="Completed">{task.completed_at ? absoluteTime(task.completed_at) : '—'}</Fact>
          <Fact label="Duration">{duration(task, now) ?? '—'}</Fact>
        </dl>
      </Card>

      <Card title="Review">
        {!reviewResult.ok ? (
          <ErrorLine
            message={
              reviewResult.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : reviewResult.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : "Couldn't load the review for this run."
            }
          />
        ) : reviewResult.data ? (
          <ReviewOutput review={reviewResult.data} repoPlatform={task.repo_platform} />
        ) : (
          <InlineStatus>
            {task.status === 'succeeded' || task.status === 'failed'
              ? 'This run completed without posting a review.'
              : 'No review yet — this run has not completed.'}
          </InlineStatus>
        )}
      </Card>

      {grafanaBaseUrl ? (
        <Card title="Run logs">
          <GrafanaPanel
            baseUrl={grafanaBaseUrl}
            dashboardUid="lci-task-runs"
            dashboardSlug="task-runs"
            panelId={100}
            title="Run logs (Grafana / Loki)"
            vars={{ task_id: task.id }}
            minHeight={420}
          />
        </Card>
      ) : null}

      <Card title="Stream logs">
        <div className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>kubectl</span>
          <div className="command-snippet">
            {/* `tabIndex={0}`: `command-snippet`'s `code` scrolls horizontally (theme.css), and a
                real job name pushes this command past the strip. Same fix, same reason as
                `ui-web`'s own `CommandSnippet` — axe `scrollable-region-focusable`, WCAG 2.1.1. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <code className={DATA_CLASS} tabIndex={0}>
              kubectl logs -f job/{task.job_name ?? `task-${task.id}`} -n lightbridge
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
