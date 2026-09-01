'use client';

import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

import { approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { relativeTime } from '../lib/domain/tasks';
import type { RepositoriesPageResponse } from '../lib/server/api';

/**
 * The Repositories list, ported from `lightbridge-code-intelligence/apps/web/components/repos/
 * repo-list.tsx` onto the current `ui-web`: `LedgerTable` (not repo cards — the source screen's
 * card grid was itself a `Card`-per-row pattern the revamped `LedgerTable` already generalises),
 * `StatusText` for approval status (not `Pill`/`status-pill`'s daisy badge — see
 * `docs/design/lci-app/PRIMITIVES.md`'s corrected Card/badge rows).
 *
 * Cursor pagination is server-driven (`page.tsx` reads `searchParams`, this component only
 * navigates to the next URL) rather than porting `use-cursor-pagination.ts`'s client-side nuqs
 * wiring verbatim — the page itself already re-renders server-side on every navigation, so there
 * is no client state to own beyond the search box.
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
  const [query, setQuery] = useQueryState('q', { defaultValue: q, clearOnDefault: true });

  const shown = page.repositories.length;
  const start = page.total === 0 ? 0 : shown; // one page at a time; no absolute offset to show

  function hrefFor(
    cursor: { activity_at: string; id: number } | null,
    direction: 'after' | 'before'
  ) {
    if (!cursor) return null;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set(`${direction}_activity_at`, cursor.activity_at);
    params.set(`${direction}_id`, String(cursor.id));
    return `/repositories?${params.toString()}`;
  }

  const nextHref = hrefFor(page.next, 'after');
  const prevHref = hrefFor(page.prev, 'before');

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Search repositories"
        hideLabel
        type="search"
        placeholder="Search repositories"
        value={query}
        onChange={(e) => setQuery(e.target.value || null)}
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
              accessor: (repo) => repoSlug(repo),
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
        />
      )}

      <Pagination
        shown={start}
        total={page.total}
        unit="repositories"
        hasPrev={Boolean(prevHref)}
        hasNext={Boolean(nextHref)}
        onPrev={
          prevHref
            ? () => {
                router.push(prevHref);
                // `force-dynamic` opts the SERVER render out of caching, but the client Router
                // Cache is a separate layer that can still serve a stale RSC payload for a
                // same-route, different-searchParams navigation — `refresh()` forces a fresh
                // fetch for the page the push just landed on.
                router.refresh();
              }
            : undefined
        }
        onNext={
          nextHref
            ? () => {
                router.push(nextHref);
                router.refresh();
              }
            : undefined
        }
      />
    </div>
  );
}
