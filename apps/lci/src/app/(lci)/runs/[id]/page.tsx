import { notFound } from 'next/navigation';

import { RunDetailCentre } from '../../../../containers/run-detail-centre';
import { gitlabLinkConfig } from '../../../../lib/domain/gitlab-links';
import { agentNamespace } from '../../../../lib/server/agent-namespace';
import { hasPermission } from '../../../../lib/server/admin';
import { getDeploymentConfig, getReview, getTask } from '../../../../lib/server/api';
import { now as fetchNow } from '../../../../lib/server/now';
import { currentClaims } from '../../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [taskResult, now, claims, config] = await Promise.all([
    getTask(id),
    fetchNow(),
    currentClaims(),
    getDeploymentConfig(),
  ]);

  if (taskResult.ok && !taskResult.data) notFound();

  const reviewResult = taskResult.ok && taskResult.data ? await getReview(id) : null;
  const gitlabLinks = gitlabLinkConfig(
    config.ok ? config.data.gitlab_base_url : null,
    config.ok ? config.data.gitlab_project_base_urls : null
  );

  return (
    <RunDetailCentre
      taskResult={taskResult}
      reviewResult={reviewResult}
      now={now}
      grafanaBaseUrl={process.env.NEXT_PUBLIC_GRAFANA_URL ?? null}
      canCancel={hasPermission(claims, 'task:cancel')}
      gitlabLinks={gitlabLinks}
      agentNamespace={agentNamespace()}
    />
  );
}
