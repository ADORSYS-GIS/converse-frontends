import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import Link from 'next/link';

import type { Repository } from '../lib/domain/repos';
import { absoluteTime, relativeTime } from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';
import { Fact } from './fact';

/** Repository overview tab: the repository's own facts. Its review analytics live on the Insights
 *  tab, drawn from the control plane's aggregates rather than from embedded Grafana panels
 *  (ADR 0018 D8). */
export function RepositoryOverviewCentre({
  result,
  now,
}: {
  result: ApiResult<Repository | null>;
  now: number;
}) {
  if (!result.ok) {
    return (
      <Card>
        <ErrorLine
          message={
            result.reason === 'unauthenticated'
              ? "Your session can't reach the control plane. Sign in again."
              : result.reason === 'unavailable'
                ? 'The control plane is unreachable right now.'
                : "Couldn't load this repository."
          }
        />
      </Card>
    );
  }
  const repo = result.data;
  if (!repo) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card title="Repository">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Default branch">
            <code className="bg-chrome rounded-field px-1.5 py-0.5 font-mono">
              {repo.default_branch}
            </code>
          </Fact>
          <Fact label="Platform">{repo.platform === 'gitlab' ? 'GitLab' : 'GitHub'}</Fact>
          <Fact label="Runs">
            <Link href={`/runs?repo=${repo.id}`} className="text-primary hover:underline">
              {repo.task_count} {repo.task_count === 1 ? 'run' : 'runs'}
            </Link>
          </Fact>
          <Fact label="Last run">
            {repo.last_task_at ? relativeTime(repo.last_task_at, now) : 'Never'}
          </Fact>
          <Fact label="Approved by">{repo.approved_by ?? '—'}</Fact>
          <Fact label="Approved at">{repo.approved_at ? absoluteTime(repo.approved_at) : '—'}</Fact>
        </dl>
      </Card>
    </div>
  );
}
