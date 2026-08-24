'use client';

import type { ApiKey, Project } from '@lightbridge/authz-rpc';
import {
  OverviewPage,
  type OverviewSelectField,
  type OverviewStatCardData,
} from '@lightbridge/ui-web';
import { useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

import { adminNavItems, navItems } from '../client/console-chrome';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { useShellTier } from '../client/use-shell-tier';

/**
 * `/` — the Overview dashboard.
 *
 * What is real here: the project and API-key counts, read through refine over the generated
 * resources.
 *
 * What is honestly empty: spend, latency and budget. Those come from the usage backend
 * (`POST /usage/v1/usage/query`) and the budget microservice, and neither has a live query client
 * in this scaffold — `packages/api-rest` still has zero importers. Rather than render plausible
 * numbers, the page carries its documented empty state: an inline status line naming exactly what
 * is missing, above still-rendered chart structure (console-ui skill §states). No sparkline is
 * fabricated either — the stat cards ship with empty series.
 */

const USAGE_PENDING_MESSAGE =
  'Usage and budget dashboards are unwired: no usage-backend query client yet (ADR 0009 follow-ups 4 and 6). Project and key counts below are live.';

function selectField(
  label: string,
  value: string,
  options: { value: string; label: string }[],
  onChange: (value: string) => void
): OverviewSelectField {
  return { label, value, options, onChange };
}

export function OverviewContainer() {
  const tier = useShellTier();
  const session = useConsoleSession();
  const scope = useConsoleScope();

  const [range, setRange] = useState('30d');
  const [bucket, setBucket] = useState('day');
  const [groupBy, setGroupBy] = useState('project');
  const [modelFilter, setModelFilter] = useState('all');

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

  const loading = projects.query.isLoading || apiKeys.query.isLoading;

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

  const accountOptions = scope.accounts.map((account) => ({
    value: account.id,
    label: account.label,
  }));
  const projectOptions = [
    { value: '', label: 'All projects' },
    ...scope.projects.map((project) => ({ value: project.id, label: project.label })),
  ];

  return (
    <OverviewPage
      tier={tier}
      orgName={scope.value.accountId || '—'}
      userEmail={session.user?.email ?? session.user?.preferredUsername ?? ''}
      userInitials={(session.user?.name ?? session.user?.email ?? '··').slice(0, 2).toUpperCase()}
      navItems={navItems('overview')}
      adminNavItems={adminNavItems('overview')}
      showAdmin={session.isAdmin}
      scopeAccountLabel={scope.value.accountId || '—'}
      scopeProjectLabel={
        scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
        'All projects'
      }
      scopeSubline={`${scope.value.accountId || '—'} · last ${range} · UTC`}
      emptyMessage={USAGE_PENDING_MESSAGE}
      statCards={statCards}
      statCardsLoading={loading}
      spendSeries={[]}
      spendChartWidth={840}
      spendChartHeight={220}
      spendStatus="ready"
      latencySeries={[]}
      latencyChartWidth={840}
      latencyChartHeight={200}
      latencyStatus="ready"
      budget={{
        value: 0,
        ceiling: 0,
        caption: 'Budget figures arrive with the budget query wiring.',
      }}
      rangeField={selectField(
        'Range',
        range,
        [
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
          { value: '90d', label: 'Last 90 days' },
        ],
        setRange
      )}
      bucketField={selectField(
        'Bucket',
        bucket,
        [
          { value: 'hour', label: 'Hour' },
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ],
        setBucket
      )}
      groupByField={selectField(
        'Group by',
        groupBy,
        [
          { value: 'project', label: 'Project' },
          { value: 'model', label: 'Model' },
        ],
        setGroupBy
      )}
      accountFilterField={selectField('Account', scope.value.accountId, accountOptions, (value) =>
        scope.setValue({ accountId: value, projectId: null })
      )}
      projectFilterField={selectField(
        'Project',
        scope.value.projectId ?? '',
        projectOptions,
        (value) => scope.setValue({ accountId: scope.value.accountId, projectId: value || null })
      )}
      modelFilterField={selectField(
        'Model',
        modelFilter,
        [{ value: 'all', label: 'All models' }],
        setModelFilter
      )}
    />
  );
}
