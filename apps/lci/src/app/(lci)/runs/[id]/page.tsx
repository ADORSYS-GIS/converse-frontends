import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { DATA_CLASS, LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { notFound } from 'next/navigation';

import { ReviewOutput } from '../../../../client/review-output';
import {
  duration,
  relativeTime,
  repoLabel,
  statusTone,
  triggerLabel,
} from '../../../../lib/domain/tasks';
import { getReview, getTask } from '../../../../lib/server/api';
import { now as fetchNow } from '../../../../lib/server/now';

export const dynamic = 'force-dynamic';

/** Run detail — status, trigger, and the persisted review, with a `kubectl logs` snippet standing
 *  in for a Grafana logs embed when `NEXT_PUBLIC_GRAFANA_URL` is unset. */
export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = await fetchNow();
  const taskResult = await getTask(id);

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
  if (!taskResult.data) notFound();

  const task = taskResult.data;
  const reviewResult = await getReview(id);
  const { tone, label } = statusTone(task.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={triggerLabel(task)}
        subtitle={`${repoLabel(task)} · ${relativeTime(task.created_at, now)}${duration(task, now) ? ` · ${duration(task, now)}` : ''}`}
        controls={<StatusText tone={tone}>{label}</StatusText>}
      />

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

      <Card title="Stream logs">
        <div className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>kubectl</span>
          <div className="command-snippet">
            <code className={DATA_CLASS}>
              kubectl logs -f job/{task.job_name ?? `task-${task.id}`} -n lightbridge
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
