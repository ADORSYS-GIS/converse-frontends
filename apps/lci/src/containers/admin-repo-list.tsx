import { Button } from '@lightbridge/ui-web/src/components/button';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

import { REPOS_PAGE_SIZE, approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { approveRepoAction, denyRepoAction } from './admin-actions';

/**
 * One status's worth of the repository approval queue — the list, its pager, and each row's
 * approve/deny actions. Search and pagination are decided by the caller; this renders whichever
 * page of results it's handed.
 */
export function AdminRepoList({
  shown,
  total,
  page,
  pageCount,
  onPageChange,
  query,
  isEmpty,
  emptyMessage,
  canApprove,
  canDeny,
}: {
  shown: Repository[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  query: string;
  isEmpty: boolean;
  emptyMessage: string;
  canApprove: boolean;
  canDeny: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <InlineStatus>{emptyMessage}</InlineStatus>
      ) : shown.length === 0 ? (
        <InlineStatus>No repositories match &quot;{query}&quot;.</InlineStatus>
      ) : (
        <ul className="divide-raised divide-y">
          {shown.map((repo) => (
            <RepoRow key={repo.id} repo={repo} canApprove={canApprove} canDeny={canDeny} />
          ))}
        </ul>
      )}

      {total > REPOS_PAGE_SIZE ? (
        <Pagination
          shown={shown.length}
          total={total}
          unit="repositories"
          hasPrev={page > 0}
          hasNext={page < pageCount - 1}
          onPrev={page > 0 ? () => onPageChange(page - 1) : undefined}
          onNext={page < pageCount - 1 ? () => onPageChange(page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function RepoRow({
  repo,
  canApprove,
  canDeny,
}: {
  repo: Repository;
  canApprove: boolean;
  canDeny: boolean;
}) {
  const { tone, label } = approvalTone(repo);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <div className="min-w-0">
        <div className="text-soft truncate text-sm font-medium">{repoSlug(repo)}</div>
        <div className={`${LABEL_CLASS} mt-0.5`}>
          {repo.platform} id {repo.platform_repo_id}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusText tone={tone}>{label}</StatusText>
        {canApprove && repo.status !== 'approved' ? (
          <form action={approveRepoAction}>
            <input type="hidden" name="id" value={repo.id} />
            <Button type="submit" variant="primary" size="sm">
              Approve
            </Button>
          </form>
        ) : null}
        {canDeny && repo.status !== 'disabled' ? (
          <form action={denyRepoAction}>
            <input type="hidden" name="id" value={repo.id} />
            <Button type="submit" variant="ghost" size="sm">
              Deny
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
