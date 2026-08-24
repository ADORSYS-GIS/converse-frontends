// Refine-driven container for `OverviewPage` — `useCustom({ url: 'overview' })` against the mock
// provider's aggregation endpoint (console-ui skill "Refine-driven mock screens": "useCustom or
// useList aggregations from fixtures"). `OverviewPage` stays pure — this container only adapts
// hook state (`query.isLoading` → skeleton props, `query.isError` → error props, `result.data` →
// stat cards / chart series / budget) into its props.

import React, { useState } from 'react';
import { useCustom } from '@refinedev/core';

import type { ConsoleShellTier } from '../components/console-shell';
import type { NavSpineItem } from '../components/nav-spine';
import { OverviewPage } from '../pages/overview';
import type { OverviewPageProps, OverviewSelectField } from '../pages/overview/types';
import {
  ACCOUNT_FILTER_OPTIONS,
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_OPTIONS,
  formatOverviewLatencyXTick,
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
} from '../pages/overview/fixtures';
import type { OverviewSnapshot } from './mock-data-provider';

const navItems: NavSpineItem[] = [
  { key: 'overview', label: 'Overview', active: true },
  { key: 'api-keys', label: 'Api-Keys' },
  { key: 'manage', label: 'Manage' },
];
const adminNavItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin' }];

function useSelectField(initial: string, options: OverviewSelectField['options'], label: string): OverviewSelectField {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

export interface RefineOverviewScreenProps {
  tier?: ConsoleShellTier;
}

export function RefineOverviewScreen({ tier = 'full' }: RefineOverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const accountFilterField = useSelectField('adorsys-gis', ACCOUNT_FILTER_OPTIONS, 'Account');
  const projectFilterField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelFilterField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  const overviewQuery = useCustom<OverviewSnapshot>({ url: 'overview', method: 'get' });

  const loading = overviewQuery.query.isLoading;
  const isError = overviewQuery.query.isError;
  const errorMessage = isError ? overviewQuery.query.error?.message : undefined;
  const snapshot = overviewQuery.result.data;

  const props: Omit<
    OverviewPageProps,
    'rangeField' | 'bucketField' | 'groupByField' | 'accountFilterField' | 'projectFilterField' | 'modelFilterField'
  > = {
    tier,
    orgName: 'adorsys-gis',
    userEmail: 'sam@adorsys.com',
    userInitials: 'SL',
    navItems,
    adminNavItems,
    showAdmin: false,
    scopeAccountLabel: 'adorsys-gis',
    scopeProjectLabel: 'all projects',
    scopeSubline: 'adorsys-gis · last 30 days · UTC',
    statCards: snapshot?.statCards ?? [],
    statCardsLoading: loading,
    spendSeries: snapshot?.spendSeries ?? [],
    spendChartWidth: 872,
    spendChartHeight: 176,
    spendStatus: loading ? 'loading' : isError ? 'error' : 'ready',
    spendErrorMessage: errorMessage,
    onRetrySpend: () => overviewQuery.query.refetch(),
    selectedSeriesKey,
    onSelectSeries: setSelectedSeriesKey,
    formatSpendXTick: formatOverviewSpendXTick,
    formatSpendYTick: formatOverviewSpendYTick,
    formatSpendTooltipValue: formatOverviewSpendTooltipValue,
    formatSpendLegendValue: formatOverviewSpendLegendValue,
    latencySeries: snapshot?.latencySeries ?? [],
    latencyChartWidth: 528,
    latencyChartHeight: 310,
    latencyStatus: loading ? 'loading' : isError ? 'error' : 'ready',
    latencyErrorMessage: errorMessage,
    onRetryLatency: () => overviewQuery.query.refetch(),
    formatLatencyXTick: formatOverviewLatencyXTick,
    budget: snapshot?.budget ?? { value: 0, ceiling: 0, caption: '' },
    needsAttentionProject: snapshot?.needsAttentionProject,
    onRequestRefill: () => {},
    refillRequestStatus: snapshot?.refillRequestStatus,
    onReviewInAdmin: () => {},
    exportCaption: 'Full monthly report lives in Manage.',
    onExportView: () => {},
  };

  return (
    <OverviewPage
      {...props}
      rangeField={rangeField}
      bucketField={bucketField}
      groupByField={groupByField}
      accountFilterField={accountFilterField}
      projectFilterField={projectFilterField}
      modelFilterField={modelFilterField}
    />
  );
}
