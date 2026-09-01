import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { RepositoriesTable } from '../../../client/repositories-table';
import { REPOS_PAGE_SIZE } from '../../../lib/domain/repos';
import { listRepositoriesPage, type RepositoriesCursor } from '../../../lib/server/api';
import { now as fetchNow } from '../../../lib/server/now';

export const dynamic = 'force-dynamic';

/** Cursor and search state both live in the URL, so a shared or reloaded link reproduces the
 *  exact page a reader was looking at. */
interface RepositoriesSearchParams {
  q?: string;
  after_activity_at?: string;
  after_id?: string;
  before_activity_at?: string;
  before_id?: string;
}

function cursorFrom(activity?: string, id?: string): RepositoriesCursor | undefined {
  if (!activity || !id) return undefined;
  const numericId = Number(id);
  return Number.isFinite(numericId) ? { activity_at: activity, id: numericId } : undefined;
}

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams: Promise<RepositoriesSearchParams>;
}) {
  const params = await searchParams;
  const result = await listRepositoriesPage({
    pageSize: REPOS_PAGE_SIZE,
    q: params.q,
    after: cursorFrom(params.after_activity_at, params.after_id),
    before: cursorFrom(params.before_activity_at, params.before_id),
  });
  const now = await fetchNow();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        subtitle="Repositories the GitHub/GitLab App is connected to, with their approval and run activity."
      />

      {!result.ok ? (
        <Card>
          <ErrorLine
            message={
              result.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : result.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load repositories${result.status ? ` (HTTP ${result.status})` : ''}.`
            }
          />
        </Card>
      ) : (
        <Card>
          <RepositoriesTable page={result.data} q={params.q ?? ''} now={now} />
        </Card>
      )}
    </div>
  );
}
