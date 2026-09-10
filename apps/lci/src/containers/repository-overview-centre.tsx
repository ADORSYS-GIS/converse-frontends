import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import Link from 'next/link';

import { repoSlug, type Repository } from '../lib/domain/repos';
import { absoluteTime, relativeTime } from '../lib/domain/tasks';
import type { ApiResult } from '../lib/server/api';
import { Fact } from './fact';
import { GrafanaPanel } from './grafana-panel';

/** Every model, not just the ones a repo happened to use this window — the dashboard's own "all"
 *  sentinel, so a newly-added model shows up without this app needing to know its name. */
const ALL_MODELS = '.+';
const LAST_30_DAYS = { from: 'now-30d', to: 'now' };

/** Repository overview tab: repository facts and review-analytics, with an honest unavailable
 *  state for the Grafana panels when `NEXT_PUBLIC_GRAFANA_URL` is unset. */
export function RepositoryOverviewCentre({
  result,
  now,
  grafanaBaseUrl,
}: {
  result: ApiResult<Repository | null>;
  now: number;
  grafanaBaseUrl: string | null;
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
      <Card title="Review analytics — last 30 days">
        {grafanaBaseUrl ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GrafanaPanel
              baseUrl={grafanaBaseUrl}
              dashboardUid="lci-review-cost"
              dashboardSlug="review-cost"
              panelId={100}
              title="Billed cost"
              vars={{ repo: repoSlug(repo), model: ALL_MODELS }}
              range={LAST_30_DAYS}
            />
            <GrafanaPanel
              baseUrl={grafanaBaseUrl}
              dashboardUid="lci-review-quality"
              dashboardSlug="review-quality"
              panelId={100}
              title="Tokens used"
              vars={{ repo: repoSlug(repo), model: ALL_MODELS }}
              range={LAST_30_DAYS}
            />
          </div>
        ) : (
          <InlineStatus>
            Set <code className="font-mono">NEXT_PUBLIC_GRAFANA_URL</code> to embed billed cost and
            tokens used from Grafana.
          </InlineStatus>
        )}
      </Card>

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
