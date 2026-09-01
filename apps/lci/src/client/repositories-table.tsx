'use client';

import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

import { approvalTone, REPOS_PAGE_SIZE, repoSlug, type Repository } from '../lib/domain/repos';
import { relativeTime } from '../lib/domain/tasks';
import type { RepositoriesPageResponse } from '../lib/server/api';
import { useCursorPagination } from './use-cursor-pagination';

/**
 * The Repositories list: a searchable, paged table of every connected repository and its
 * approval/run activity. Search and paging update live as the user types or clicks — every field
 * carries `shallow: false` (`use-cursor-pagination.ts` has the fuller reasoning), so there's no
 * separate submit step.
 */
export function RepositoriesTable({
  page,
  q,
  now,
}: {
  page: RepositoriesPageResponse;
  q: string;
  now: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useQueryState('q', {
    defaultValue: q,
    clearOnDefault: true,
    shallow: false,
  });
  const { current, pageCount, goToPage, reset } = useCursorPagination({
    total: page.total,
    pageSize: REPOS_PAGE_SIZE,
    next: page.next,
    prev: page.prev,
  });

  const shown = page.repositories.length;
  const start = page.total === 0 ? 0 : shown; // one page at a time; no absolute offset to show

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
          reset();
        }}
        containerClassName="max-w-sm"
      />

      {page.repositories.length === 0 ? (
        <InlineStatus>
          {query ? `No repositories match "${query}".` : 'No repositories connected yet.'}
        </InlineStatus>
      ) : (
        <LedgerTable<Repository>
          columns={[
            {
              key: 'name',
              header: 'Repository',
              accessor: (repo) => <span className="text-ink">{repoSlug(repo)}</span>,
            },
            {
              key: 'branch',
              header: 'Default branch',
              accessor: (repo) => repo.default_branch,
              kind: 'data',
            },
            {
              key: 'runs',
              header: 'Runs',
              accessor: (repo) => String(repo.task_count),
              kind: 'data',
              align: 'right',
            },
            {
              key: 'last_run',
              header: 'Last run',
              accessor: (repo) => (repo.last_task_at ? relativeTime(repo.last_task_at, now) : '—'),
              kind: 'data',
              align: 'right',
            },
            {
              key: 'status',
              header: 'Status',
              accessor: (repo) => {
                const { tone, label } = approvalTone(repo);
                return <StatusText tone={tone}>{label}</StatusText>;
              },
            },
          ]}
          data={page.repositories}
          rowKey={(repo) => String(repo.id)}
          // The whole row opens the repository — a reader shouldn't have to land a click on one
          // narrow column just to drill in. This also makes every row a keyboard stop (Enter or
          // Space opens it), not only the pointer target.
          onSelectRow={(repo) => router.push(`/repositories/${repo.id}`)}
        />
      )}

      <Pagination
        shown={start}
        total={page.total}
        unit="repositories"
        hasPrev={current > 0}
        hasNext={current < pageCount - 1}
        onPrev={current > 0 ? () => goToPage(current - 1) : undefined}
        onNext={current < pageCount - 1 ? () => goToPage(current + 1) : undefined}
      />
    </div>
  );
}
