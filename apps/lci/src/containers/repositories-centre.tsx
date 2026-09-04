'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

import { approvalTone, REPOS_PAGE_SIZE, repoSlug, type Repository } from '../lib/domain/repos';
import { relativeTime } from '../lib/domain/tasks';
import type { ApiResult, RepositoriesPageResponse } from '../lib/server/api';
import { useCursorPagination } from './use-cursor-pagination';

/**
 * The Repositories screen: title, a searchable and paged table of every connected repository and
 * its approval/run activity. Search and paging update live as the user types or clicks — every
 * field carries `shallow: false` (`use-cursor-pagination.ts` has the fuller reasoning), so there's
 * no separate submit step.
 *
 * The search box is a `PageControls` row on the FLOOR, between the title and the ledger's `Card` —
 * not a toolbar inside the card it filters (owner directive 2026-09-03, "filters are outside
 * cards"; ADR 0015 amendment A2, the cutover `apps/console` made in #504). The filter state is
 * owned here rather than inside `RepositoriesList`, so the row survives the error branch: a reader
 * whose query failed used to lose the search box along with the table.
 *
 * The pager is read here for the same reason — `useCursorPagination` needs `total`/`next`/`prev`,
 * which only a successful response carries, so the failure branch feeds it an empty page. The hook
 * still runs unconditionally (React's rules leave no choice), and `reset()` is what a search change
 * calls to drop the cursor.
 */
export function RepositoriesCentre({
  result,
  q,
  now,
}: {
  result: ApiResult<RepositoriesPageResponse>;
  q: string;
  now: number;
}) {
  const page = result.ok ? result.data : null;

  const [query, setQuery] = useQueryState('q', {
    defaultValue: q,
    clearOnDefault: true,
    shallow: false,
  });
  const { current, pageCount, goToPage, reset } = useCursorPagination({
    total: page?.total ?? 0,
    pageSize: REPOS_PAGE_SIZE,
    next: page?.next ?? null,
    prev: page?.prev ?? null,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        subtitle="Repositories the GitHub/GitLab App is connected to, with their approval and run activity."
      />

      <PageControls
        label="Filters"
        onReset={
          query
            ? () => {
                void setQuery(null);
                reset();
              }
            : undefined
        }
        groups={[
          {
            id: 'slice',
            label: 'Slice',
            children: (
              <Field
                label="Search repositories"
                layout="inline"
                hideLabel
                type="search"
                placeholder="Search repositories"
                value={query}
                onChange={(e) => {
                  void setQuery(e.target.value || null);
                  reset();
                }}
              />
            ),
          },
        ]}
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
          <RepositoriesList
            page={result.data}
            query={query}
            now={now}
            current={current}
            pageCount={pageCount}
            onGoToPage={goToPage}
          />
        </Card>
      )}
    </div>
  );
}

/** Content only — the table and its pager. The search that decides WHICH repositories reach this
 *  component lives in the `PageControls` row above the card. */
function RepositoriesList({
  page,
  query,
  now,
  current,
  pageCount,
  onGoToPage,
}: {
  page: RepositoriesPageResponse;
  query: string;
  now: number;
  current: number;
  pageCount: number;
  onGoToPage: (target: number) => void;
}) {
  const router = useRouter();

  const shown = page.repositories.length;
  const start = page.total === 0 ? 0 : shown; // one page at a time; no absolute offset to show

  return (
    <div className="flex flex-col gap-4">
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
        onPrev={current > 0 ? () => onGoToPage(current - 1) : undefined}
        onNext={current < pageCount - 1 ? () => onGoToPage(current + 1) : undefined}
      />
    </div>
  );
}
