import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { RunsTable } from '../../../client/runs-table';
import { RUNS_PAGE_SIZE } from '../../../lib/domain/tasks';
import { listTasksPage, type TasksStatusFilter } from '../../../lib/server/api';
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

/** Runs list — every task run, filterable by status and free text, most recent first. */
export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<RunsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '0');
  const status = isStatusFilter(params.status) ? params.status : undefined;
  const repositoryId = params.repo ? Number(params.repo) : undefined;

  const result = await listTasksPage({
    page: Number.isFinite(page) ? page : 0,
    pageSize: RUNS_PAGE_SIZE,
    status,
    repositoryId: Number.isFinite(repositoryId) ? repositoryId : undefined,
    q: params.q,
  });
  const now = await fetchNow();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Runs" subtitle="Every task run, most recent first." />

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
        <Card>
          <RunsTable tasks={result.data.tasks} total={result.data.total} now={now} />
        </Card>
      )}
    </div>
  );
}
