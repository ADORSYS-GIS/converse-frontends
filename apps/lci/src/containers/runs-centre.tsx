'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs';

import {
  duration,
  relativeTime,
  repoLabel,
  RUNS_PAGE_SIZE,
  shortSha,
  statusTone,
  triggerLabel,
  type Task,
} from '../lib/domain/tasks';
import type { ApiResult, TasksPageResponse } from '../lib/server/api';

const FILTER_VALUES = ['all', 'active', 'pending', 'success', 'error', 'muted'] as const;
type FilterValue = (typeof FILTER_VALUES)[number];

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Running' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Succeeded' },
  { value: 'error', label: 'Failed' },
  { value: 'muted', label: 'Cancelled' },
];

/**
 * The Runs screen: title, a status filter, a text search, and a paged table — every field updates
 * live in the URL as the user types or clicks, with no separate submit step.
 *
 * Filters live in `PageControls`, the full-width row below the title (owner directive
 * 2026-09-03, ADR 0015 amendment A2 — same pattern the console's API-keys screen uses): the
 * `Card` below holds the list and only the list, not a mix of controls and rows in one box.
 *
 * **Simplification, stated not hidden**: a day-grouped timeline view is a distinct visual form
 * worth its own follow-up once this table view is confirmed against real data; only the table
 * view renders here for now.
 */
export function RunsCentre({ result, now }: { result: ApiResult<TasksPageResponse>; now: number }) {
  const router = useRouter();
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(FILTER_VALUES).withDefault('all').withOptions({ shallow: false })
  );
  const [query, setQuery] = useQueryState('q', {
    defaultValue: '',
    clearOnDefault: true,
    shallow: false,
  });
  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(0).withOptions({ shallow: false })
  );

  // Any filter change invalidates the current page offset, so reset to the first page.
  const resetPage = () => setPage(null);

  const filtersActive = status !== 'all' || query !== '';
  const resetFilters = () => {
    setStatus(null);
    setQuery(null);
    resetPage();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Runs" subtitle="Every task run, most recent first." />

      <PageControls
        label="Filter runs"
        onReset={filtersActive ? resetFilters : undefined}
        groups={[
          {
            id: 'filters',
            label: 'Filter runs',
            children: (
              <RunsControls
                status={status}
                onStatusChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                query={query}
                onQueryChange={(value) => {
                  setQuery(value || null);
                  resetPage();
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
                  : `Couldn't load runs${result.status ? ` (HTTP ${result.status})` : ''}.`
            }
          />
        </Card>
      ) : (
        <Card>
          <RunsList
            tasks={result.data.tasks}
            total={result.data.total}
            now={now}
            page={page}
            onPageChange={setPage}
            onSelectRow={(id) => router.push(`/runs/${id}`)}
          />
        </Card>
      )}
    </div>
  );
}

function RunsControls({
  status,
  onStatusChange,
  query,
  onQueryChange,
}: {
  status: FilterValue;
  onStatusChange: (value: FilterValue) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl<FilterValue>
        aria-label="Filter by status"
        options={FILTERS}
        value={status}
        onChange={onStatusChange}
      />
      <Field
        label="Search runs"
        hideLabel
        type="search"
        placeholder="Search runs"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        containerClassName="max-w-xs"
      />
    </div>
  );
}

function RunsList({
  tasks,
  total,
  now,
  page,
  onPageChange,
  onSelectRow,
}: {
  tasks: Task[];
  total: number;
  now: number;
  page: number;
  onPageChange: (page: number) => void;
  onSelectRow: (id: string) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / RUNS_PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const start = current * RUNS_PAGE_SIZE;
  const rangeLabel =
    total === 0 ? 'No results' : `${start + 1}–${Math.min(start + RUNS_PAGE_SIZE, total)}`;

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 ? (
        <InlineStatus>No runs match the current filters.</InlineStatus>
      ) : (
        <LedgerTable<Task>
          columns={[
            {
              key: 'status',
              header: 'Status',
              accessor: (t) => {
                const { tone, label } = statusTone(t.status);
                return <StatusText tone={tone}>{label}</StatusText>;
              },
            },
            {
              key: 'trigger',
              header: 'Trigger',
              accessor: (t) => <span className="text-ink">{triggerLabel(t)}</span>,
            },
            { key: 'repo', header: 'Repository', accessor: (t) => repoLabel(t), kind: 'data' },
            {
              key: 'branch',
              header: 'Branch / SHA',
              accessor: (t) => t.repo_default_branch ?? shortSha(t.head_sha) ?? '—',
              kind: 'data',
            },
            {
              key: 'created',
              header: 'Created',
              accessor: (t) => relativeTime(t.created_at, now),
              kind: 'data',
              align: 'right',
            },
            {
              key: 'duration',
              header: 'Duration',
              accessor: (t) => duration(t, now) ?? '—',
              kind: 'data',
              align: 'right',
            },
          ]}
          data={tasks}
          rowKey={(t) => t.id}
          // The whole row opens the run — a reader shouldn't have to land a click on one narrow
          // column just to see what happened. This also makes every row a keyboard stop (Enter
          // or Space opens it), not only the pointer target.
          onSelectRow={(t) => onSelectRow(t.id)}
        />
      )}

      <Pagination
        shown={tasks.length}
        total={total}
        unit="runs"
        hasPrev={current > 0}
        hasNext={current < pageCount - 1}
        onPrev={current > 0 ? () => onPageChange(current - 1) : undefined}
        onNext={current < pageCount - 1 ? () => onPageChange(current + 1) : undefined}
      />
      {total > 0 ? (
        <p className="text-subtle font-mono text-[11px]">
          {rangeLabel} of {total}
        </p>
      ) : null}
    </div>
  );
}
