'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import type { OverviewStatCardData, RailSelectProps } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import {
  OVERVIEW_BUCKETS,
  OVERVIEW_GROUP_BYS,
  OVERVIEW_RANGES,
  OVERVIEW_SELECTION_OPTIONS,
  useOverviewParams,
} from '../client/url-state';

/**
 * `/` — the Overview dashboard's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/page.tsx`).
 *
 * The two callers issue the same `useList` query keys, so TanStack Query serves both from one
 * request; the view state they both read is the **query string** (ADR 0011) — `?range=7d&series=…`
 * — so the rail's RANGE select and the centre's chart cannot drift apart, and the dashboard a user
 * has configured is a link they can send.
 *
 * What is real here: the project and API-key counts, read through refine over the generated
 * resources.
 *
 * What is honestly empty: spend, latency and budget. Those come from the usage backend
 * (`POST /usage/v1/usage/query`) and the budget microservice, and neither has a live query client
 * in this scaffold — `packages/api-rest` still has zero importers. Rather than render plausible
 * numbers, every chart/budget section below is driven with `status="unwired"` — a distinct status
 * from `"loading"` (implies a request in flight) and from a `"ready"` section given an empty
 * array (implies a query ran and genuinely found nothing) — which renders console-ui's documented
 * empty-state shape (still-rendered chart structure, an inline status line naming the real
 * reason) with wording honest about "never queried" rather than "queried and empty" (#272/#273).
 * No sparkline is fabricated either — the stat cards omit `sparklineData` entirely rather than
 * pass an empty series.
 */

// Console-ui#326: drop the "(ADR 0009 follow-ups 4 and 6)" citation — follow-up 4 (the
// `apps/console` scaffold) shipped, so citing it as a reason the dashboards are unwired was
// simply wrong, and this string is customer-visible copy in a self-service console, not an
// engineering changelog. Every string in this file states plainly what is missing instead of
// pointing at an internal, mutable ADR follow-up index (see the PR body for the full argument);
// the underlying fact — no usage-backend query client exists yet — stays, because that IS true
// and IS what the reader needs to know, unlike the citation.
export const USAGE_PENDING_MESSAGE =
  'Usage and budget dashboards are unwired: no usage-backend query client yet. Project and key counts below are live.';

/**
 * The Overview EXPORT rail control's disabled-reason caption (console-ui#324) — the CSV export
 * route doesn't exist yet (tracked separately as `#308`, Epic 4). Shared by `OverviewRail` and
 * `OverviewCentre` so the persistent rail and the compact-tier sheet can never drift onto
 * different wording for the same control.
 */
export const OVERVIEW_EXPORT_UNAVAILABLE_CAPTION = "Export isn't available yet.";

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const BUCKET_LABELS: Record<(typeof OVERVIEW_BUCKETS)[number], string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
};

const GROUP_BY_LABELS: Record<(typeof OVERVIEW_GROUP_BYS)[number], string> = {
  project: 'Project',
  model: 'Model',
};

// The option lists are derived from the URL contract's own literal unions rather than declared
// beside it: a value the rail can offer but the parser would reject is exactly the drift ADR 0011
// makes the contract module responsible for preventing.
const RANGE_OPTIONS = OVERVIEW_RANGES.map((value) => ({ value, label: RANGE_LABELS[value] }));
const BUCKET_OPTIONS = OVERVIEW_BUCKETS.map((value) => ({ value, label: BUCKET_LABELS[value] }));
const GROUP_BY_OPTIONS = OVERVIEW_GROUP_BYS.map((value) => ({
  value,
  label: GROUP_BY_LABELS[value],
}));

const MODEL_OPTIONS = [{ value: 'all', label: 'All models' }];

export interface OverviewScreen {
  scopeAccountLabel: string;
  scopeProjectLabel: string;
  subline: string;
  emptyMessage: string;
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  selectedSeriesKey: string | null;
  setSelectedSeriesKey: (key: string | null) => void;
  rangeField: RailSelectProps;
  bucketField: RailSelectProps;
  groupByField: RailSelectProps;
  accountField: RailSelectProps;
  projectField: RailSelectProps;
  modelField: RailSelectProps;
}

export function useOverviewScreen(): OverviewScreen {
  const scope = useConsoleScope();
  const [view, setView] = useOverviewParams();

  const projects = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.accountId
      ? [{ field: 'accountId', operator: 'eq', value: scope.value.accountId }]
      : [],
  });

  const apiKeys = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.projectId
      ? [{ field: 'projectId', operator: 'eq', value: scope.value.projectId }]
      : [],
  });

  const statCards = useMemo<OverviewStatCardData[]>(
    () => [
      {
        key: 'projects',
        icon: 'projects',
        label: 'Projects',
        metric: String(projects.result.total ?? 0),
        // No `sparklineData` — there is no trend series behind this count (no usage-backend
        // query client yet), and `OverviewStatRow` renders no sparkline slot at all when it's
        // omitted, rather than an empty/flat decorative line (#273).
      },
      {
        key: 'keys',
        icon: 'keys',
        label: 'API keys',
        metric: String(apiKeys.result.total ?? 0),
        // No `sparklineData` — see the `projects` card above.
      },
    ],
    [projects.result.total, apiKeys.result.total]
  );

  const scopeProjectLabel =
    scope.projects.find((project) => project.id === scope.value.projectId)?.label ?? 'All projects';

  return {
    scopeAccountLabel: scope.value.accountId || '—',
    scopeProjectLabel,
    subline: `${scope.value.accountId || '—'} · last ${view.range} · UTC`,
    emptyMessage: USAGE_PENDING_MESSAGE,
    statCards,
    statCardsLoading: projects.query.isLoading || apiKeys.query.isLoading,
    // `''` is the parser default (absent from the URL); the chart sections speak `null`.
    selectedSeriesKey: view.series || null,
    setSelectedSeriesKey: (series) => {
      void setView({ series: series ?? '' }, OVERVIEW_SELECTION_OPTIONS);
    },
    rangeField: {
      label: 'Range',
      value: view.range,
      options: RANGE_OPTIONS,
      onChange: (range) => {
        void setView({ range: range as (typeof OVERVIEW_RANGES)[number] });
      },
    },
    bucketField: {
      label: 'Bucket',
      value: view.bucket,
      options: BUCKET_OPTIONS,
      onChange: (bucket) => {
        void setView({ bucket: bucket as (typeof OVERVIEW_BUCKETS)[number] });
      },
    },
    groupByField: {
      label: 'Group by',
      value: view.groupBy,
      options: GROUP_BY_OPTIONS,
      onChange: (groupBy) => {
        void setView({ groupBy: groupBy as (typeof OVERVIEW_GROUP_BYS)[number] });
      },
    },
    accountField: {
      label: 'Account',
      value: scope.value.accountId,
      options: scope.accounts.map((account) => ({ value: account.id, label: account.label })),
      onChange: (accountId) => scope.setValue({ accountId, projectId: null }),
    },
    projectField: {
      label: 'Project',
      value: scope.value.projectId ?? '',
      options: [
        { value: '', label: 'All projects' },
        ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
      ],
      onChange: (projectId) =>
        scope.setValue({ accountId: scope.value.accountId, projectId: projectId || null }),
    },
    modelField: {
      label: 'Model',
      value: view.model,
      options: MODEL_OPTIONS,
      onChange: (model) => {
        void setView({ model });
      },
    },
  };
}
