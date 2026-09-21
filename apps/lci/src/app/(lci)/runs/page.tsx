import { RunsCentre } from '../../../containers/runs-centre';
import { gitlabLinkConfig } from '../../../lib/domain/gitlab-links';
import { RUNS_PAGE_SIZE } from '../../../lib/domain/tasks';
import {
  getDeploymentConfig,
  listTasksPage,
  type TasksStatusFilter,
} from '../../../lib/server/api';
import { now as fetchNow } from '../../../lib/server/now';

export const dynamic = 'force-dynamic';

const STATUS_VALUES: TasksStatusFilter[] = ['active', 'pending', 'success', 'error', 'muted'];

function isStatusFilter(value: string | undefined): value is TasksStatusFilter {
  return value !== undefined && (STATUS_VALUES as string[]).includes(value);
}

interface RunsSearchParams {
  status?: string;
  repo?: string;
  q?: string;
  page?: string;
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<RunsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '0');
  const status = isStatusFilter(params.status) ? params.status : undefined;
  const repositoryId = params.repo ? Number(params.repo) : undefined;

  const [result, now, config] = await Promise.all([
    listTasksPage({
      page: Number.isFinite(page) ? page : 0,
      pageSize: RUNS_PAGE_SIZE,
      status,
      repositoryId: Number.isFinite(repositoryId) ? repositoryId : undefined,
      q: params.q,
    }),
    fetchNow(),
    getDeploymentConfig(),
  ]);
  const gitlabLinks = gitlabLinkConfig(
    config.ok ? config.data.gitlab_base_url : null,
    config.ok ? config.data.gitlab_project_base_urls : null
  );

  return <RunsCentre result={result} now={now} gitlabLinks={gitlabLinks} />;
}
