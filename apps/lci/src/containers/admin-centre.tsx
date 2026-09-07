'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { parseAsInteger, useQueryState } from 'nuqs';

import { REPOS_PAGE_SIZE, repoSlug, type Repository } from '../lib/domain/repos';
import type { ApiResult } from '../lib/server/api';
import { AdminRepoList } from './admin-repo-list';
import { AdminTabsNav } from './admin-tabs-nav';

/**
 * Repository approvals — one status per route (`/admin` = pending, `/admin/accepted`,
 * `/admin/denied`), a shared subtitle and tab strip, and a paginated/searchable list of that
 * status's repositories. Decisions are reversible: deny an approved repo from its own tab to take
 * it back out of scope, or approve a denied one to bring it in — it then moves to the other tab.
 *
 * Search is a `PageControls` row on the floor, between the tab strip and the list `Card`, not a
 * field sitting inside the card it filters — so it stays visible, and usable, even when the list
 * itself fails to load.
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
  const [query, setQuery] = useQueryState('q', { defaultValue: '', clearOnDefault: true });
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0));

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

  const repos = result.ok ? result.data : [];
  const filtered = query
    ? repos.filter((repo) => repoSlug(repo).toLowerCase().includes(query.toLowerCase()))
    : repos;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / REPOS_PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const start = current * REPOS_PAGE_SIZE;
  const shown = filtered.slice(start, start + REPOS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repository approvals"
        subtitle="Newly added repositories stay pending until approved — only then are they indexed or reviewed. Decisions are reversible: deny an approved repo to take it back out of scope, or approve a denied one to bring it in."
      />
      <AdminTabsNav />

      <PageControls
        label="Search"
        groups={[
          {
            id: 'search',
            label: 'Search',
            children: (
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
        <Card title={title}>
          <AdminRepoList
            shown={shown}
            total={total}
            page={current}
            pageCount={pageCount}
            onPageChange={(target) => setPage(target)}
            query={query}
            isEmpty={repos.length === 0}
            emptyMessage={emptyMessage}
            canApprove={canApprove}
            canDeny={canDeny}
          />
        </Card>
      )}
    </div>
  );
}
