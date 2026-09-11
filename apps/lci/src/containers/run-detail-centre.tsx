import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { CommandSnippet } from '@lightbridge/ui-web/src/components/command-snippet';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { CancelIcon } from '@lightbridge/ui-web/src/lib/icons';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';

import {
  absoluteTime,
  duration,
  relativeTime,
  repoLabel,
  shortSha,
  statusOutcome,
  statusTone,
  triggerLabel,
  triggerUrl,
  type Review,
  type Task,
} from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';
import { Fact } from './fact';
import { GrafanaPanel } from './grafana-panel';
import { ReviewOutput } from './review-output';
import { cancelRunAction } from './run-detail-actions';

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
 * The same group carries the one action this screen has — cancelling a run that hasn't finished —
 * next to the readout it acts on, the same shape `RepositoryShell` uses for its own approval row.
 */
export function RunDetailCentre({
  taskResult,
  reviewResult,
  now,
  grafanaBaseUrl,
  canCancel,
}: {
  taskResult: ApiResult<Task | null>;
  reviewResult: ApiResult<Review | null> | null;
  now: number;
  grafanaBaseUrl: string | null;
  canCancel: boolean;
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
  const outcome = statusOutcome(task.status);
  const cancellable = canCancel && (outcome === 'pending' || outcome === 'active');
  const triggerHref = triggerUrl(task);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={triggerLabel(task)}
        subtitle={`${repoLabel(task)} · ${relativeTime(task.created_at, now)}`}
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
            children: (
              <>
                <StatusText tone={tone} className="self-center">
                  {label}
                </StatusText>
                {cancellable ? (
                  <form action={cancelRunAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      <CancelIcon />
                      Cancel run
                    </Button>
                  </form>
                ) : null}
              </>
            ),
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
          <Fact label="Default branch">{task.repo_default_branch ?? '—'}</Fact>
          <Fact label="Trigger">
            {triggerHref ? (
              <a
                href={triggerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline">
                {triggerLabel(task)}
              </a>
            ) : (
              triggerLabel(task)
            )}
          </Fact>
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
        <CommandSnippet
          label="kubectl"
          command={`kubectl logs -f job/${task.job_name ?? `task-${task.id}`} -n lightbridge`}
        />
      </Card>
    </div>
  );
}
