import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import type { Repository } from '../lib/domain/repos';
import type { ApiResult } from '../lib/server/api';
import { AdminRepoList } from './admin-repo-list';
import { AdminTabsNav } from './admin-tabs-nav';

/**
 * Repository approvals — one status per route (`/admin` = pending, `/admin/accepted`,
 * `/admin/denied`), a shared subtitle and tab strip, and a paginated/searchable list of that
 * status's repositories. Decisions are reversible: deny an approved repo from its own tab to take
 * it back out of scope, or approve a denied one to bring it in — it then moves to the other tab.
 */
export function AdminCentre({
  title,
  emptyMessage,
  result,
  canApprove,
  canDeny,
}: {
  title: string;
  emptyMessage: string;
  result: ApiResult<Repository[]> | null;
  canApprove: boolean;
  canDeny: boolean;
}) {
  if (!result) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Repository approvals" />
        <Card>
          <ErrorLine message="You need the repo:approve or repo:deny permission to manage repository approvals. Ask an administrator to grant it." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repository approvals"
        subtitle="Newly added repositories stay pending until approved — only then are they indexed or reviewed. Decisions are reversible: deny an approved repo to take it back out of scope, or approve a denied one to bring it in."
      />
      <AdminTabsNav />

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
        <Card title={title}>
          <AdminRepoList
            repos={result.data}
            emptyMessage={emptyMessage}
            canApprove={canApprove}
            canDeny={canDeny}
          />
        </Card>
      )}
    </div>
  );
}
