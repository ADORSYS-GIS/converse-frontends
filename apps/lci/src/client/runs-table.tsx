'use client';

import { Field } from '@lightbridge/ui-web/src/components/field';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LedgerTable } from '@lightbridge/ui-web/src/components/ledger-table';
import { Pagination } from '@lightbridge/ui-web/src/components/pagination';
import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
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
 * Runs list: status filter, text search, and a paged table, all live in the URL — every field
 * updates the table as the user types or clicks, with no separate submit step. **Simplification,
 * stated not hidden**: a day-grouped timeline view is a distinct visual form worth its own
 * follow-up once this table view is confirmed against real data; only the table view renders
 * here for now.
 */
export function RunsTable({ tasks, total, now }: { tasks: Task[]; total: number; now: number }) {
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

  const pageCount = Math.max(1, Math.ceil(total / RUNS_PAGE_SIZE));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  const start = current * RUNS_PAGE_SIZE;
  const rangeLabel =
    total === 0 ? 'No results' : `${start + 1}–${Math.min(start + RUNS_PAGE_SIZE, total)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<FilterValue>
          aria-label="Filter by status"
          options={FILTERS}
          value={status}
          onChange={(value) => {
            setStatus(value);
            resetPage();
          }}
        />
        <Field
          label="Search runs"
          hideLabel
          type="search"
          placeholder="Search runs"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value || null);
            resetPage();
          }}
          containerClassName="max-w-xs"
        />
      </div>

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
          onSelectRow={(t) => router.push(`/runs/${t.id}`)}
        />
      )}

      <Pagination
        shown={tasks.length}
        total={total}
        unit="runs"
        hasPrev={current > 0}
        hasNext={current < pageCount - 1}
        onPrev={current > 0 ? () => setPage(current - 1) : undefined}
        onNext={current < pageCount - 1 ? () => setPage(current + 1) : undefined}
      />
      {total > 0 ? (
        <p className="text-subtle font-mono text-[11px]">
          {rangeLabel} of {total}
        </p>
      ) : null}
    </div>
  );
}
