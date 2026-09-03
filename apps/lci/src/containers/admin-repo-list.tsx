'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { parseAsInteger, useQueryState } from 'nuqs';

import { approvalTone, REPOS_PAGE_SIZE, repoSlug, type Repository } from '../lib/domain/repos';
import { approveRepoAction, denyRepoAction } from './admin-actions';

/**
 * One status's worth of the repository approval queue — search + real pagination over the list
 * the server already fetched for that status. The control plane's `/admin/repositories` endpoint
 * has no `page`/`pageSize` of its own, so this pages and filters the fetched array client-side;
 * that's a real, working control for queues of the size this screen expects, not a placeholder —
 * worth revisiting for server-side paging only if a single status ever grows large enough to make
 * one full fetch expensive.
 */
export function AdminRepoList({
  repos,
  emptyMessage,
  canApprove,
  canDeny,
}: {
  repos: Repository[];
  emptyMessage: string;
  canApprove: boolean;
  canDeny: boolean;
}) {
  const [query, setQuery] = useQueryState('q', {
    defaultValue: '',
    clearOnDefault: true,
  });
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0));

  const filtered = query
    ? repos.filter((repo) => repoSlug(repo).toLowerCase().includes(query.toLowerCase()))
    : repos;

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / REPOS_PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const start = current * REPOS_PAGE_SIZE;
  const shown = filtered.slice(start, start + REPOS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Search repositories"
        hideLabel
        type="search"
        placeholder="Search repositories"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value || null);
          setPage(null);
        }}
        containerClassName="max-w-xs"
      />

      {repos.length === 0 ? (
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
          hasPrev={current > 0}
          hasNext={current < pageCount - 1}
          onPrev={current > 0 ? () => setPage(current - 1) : undefined}
          onNext={current < pageCount - 1 ? () => setPage(current + 1) : undefined}
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
