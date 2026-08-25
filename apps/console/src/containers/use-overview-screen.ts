'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import type { OverviewStatCardData, RailSelectProps } from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useConsoleScopeContext } from '../client/console-scope-context';
import { useOverviewViewState } from '../client/view-state';

/**
 * `/` — the Overview dashboard's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/page.tsx`).
 *
 * The two callers issue the same `useList` query keys, so TanStack Query serves both from one
 * request; the view state they both read comes from the console layout's own provider.
 *
 * What is real here: the project and API-key counts, read through refine over the generated
 * resources.
 *
 * What is honestly empty: spend, latency and budget. Those come from the usage backend
 * (`POST /usage/v1/usage/query`) and the budget microservice, and neither has a live query client
 * in this scaffold — `packages/api-rest` still has zero importers. Rather than render plausible
 * numbers, the screen carries its documented empty state: an inline status line naming exactly
 * what is missing, above still-rendered chart structure (console-ui skill §states). No sparkline
 * is fabricated either — the stat cards ship with empty series.
 */

export const USAGE_PENDING_MESSAGE =
  'Usage and budget dashboards are unwired: no usage-backend query client yet (ADR 0009 follow-ups 4 and 6). Project and key counts below are live.';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const BUCKET_OPTIONS = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
];

const GROUP_BY_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'model', label: 'Model' },
];

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
  const scope = useConsoleScopeContext();
  const [view, patchView] = useOverviewViewState();

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
        sparklineData: [],
      },
      {
        key: 'keys',
        icon: 'keys',
        label: 'API keys',
        metric: String(apiKeys.result.total ?? 0),
        sparklineData: [],
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
    selectedSeriesKey: view.selectedSeriesKey,
    setSelectedSeriesKey: (selectedSeriesKey) => patchView({ selectedSeriesKey }),
    rangeField: {
      label: 'Range',
      value: view.range,
      options: RANGE_OPTIONS,
      onChange: (range) => patchView({ range }),
    },
    bucketField: {
      label: 'Bucket',
      value: view.bucket,
      options: BUCKET_OPTIONS,
      onChange: (bucket) => patchView({ bucket }),
    },
    groupByField: {
      label: 'Group by',
      value: view.groupBy,
      options: GROUP_BY_OPTIONS,
      onChange: (groupBy) => patchView({ groupBy }),
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
      value: view.modelFilter,
      options: MODEL_OPTIONS,
      onChange: (modelFilter) => patchView({ modelFilter }),
    },
  };
}
