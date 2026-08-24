import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { NavSpineItem } from '../../components/nav-spine';
import { OverviewPage } from './component';
import type { OverviewPageProps, OverviewSelectField } from './types';
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
  overviewBudget,
  overviewEmptyStatCards,
  overviewLatencySeries,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewSpendSeries,
  overviewStatCards,
} from './fixtures';

function Glyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" />
    </svg>
  );
}

function navItems(active: string): NavSpineItem[] {
  return [
    { key: 'overview', label: 'Overview', icon: <Glyph />, active: active === 'overview' },
    { key: 'api-keys', label: 'Api-Keys', icon: <Glyph />, active: active === 'api-keys' },
    { key: 'manage', label: 'Manage', icon: <Glyph />, active: active === 'manage' },
  ];
}

const adminNavItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin', icon: <Glyph /> }];

function useSelectField(initial: string, options: OverviewSelectField['options'], label: string): OverviewSelectField {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

function baseProps(overrides: Partial<OverviewPageProps> = {}): Omit<
  OverviewPageProps,
  | 'rangeField'
  | 'bucketField'
  | 'groupByField'
  | 'accountFilterField'
  | 'projectFilterField'
  | 'modelFilterField'
> {
  return {
    orgName: 'adorsys-gis',
    userEmail: 'sam@adorsys.com',
    userInitials: 'SL',
    navItems: navItems('overview'),
    adminNavItems,
    showAdmin: false,
    scopeAccountLabel: 'adorsys-gis',
    scopeProjectLabel: 'all projects',
    scopeSubline: 'adorsys-gis · last 30 days · UTC',
    statCards: overviewStatCards,
    spendSeries: overviewSpendSeries,
    spendChartWidth: 872,
    spendChartHeight: 176,
    formatSpendXTick: formatOverviewSpendXTick,
    formatSpendYTick: formatOverviewSpendYTick,
    formatSpendTooltipValue: formatOverviewSpendTooltipValue,
    formatSpendLegendValue: formatOverviewSpendLegendValue,
    latencySeries: overviewLatencySeries,
    latencyChartWidth: 528,
    latencyChartHeight: 310,
    formatLatencyXTick: formatOverviewLatencyXTick,
    budget: overviewBudget,
    needsAttentionProject: overviewNeedsAttentionProject,
    refillRequestStatus: overviewRefillRequestStatus,
    exportCaption: 'Full monthly report lives in Manage.',
    ...overrides,
  };
}

function Demo({ overrides = {} }: { overrides?: Partial<OverviewPageProps> }) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const accountFilterField = useSelectField('adorsys-gis', ACCOUNT_FILTER_OPTIONS, 'Account');
  const projectFilterField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelFilterField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  return (
    <OverviewPage
      {...baseProps({
        selectedSeriesKey,
        onSelectSeries: setSelectedSeriesKey,
        onRequestRefill: () => {},
        onReviewInAdmin: () => {},
        onExportView: () => {},
        ...overrides,
      })}
      rangeField={rangeField}
      bucketField={bucketField}
      groupByField={groupByField}
      accountFilterField={accountFilterField}
      projectFilterField={projectFilterField}
      modelFilterField={modelFilterField}
    />
  );
}

const meta: Meta<typeof OverviewPage> = {
  title: 'Pages/Overview',
  component: OverviewPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewPage>;

// `lg` (≥1024, the default story viewport — see .storybook/preview.tsx). Visually comparable
// 1:1 to docs/design/console-redesign/overview.svg — forced to the mockup's exact 1440 content
// width; the real iframe is also ≥1024 (the `lg:` media query itself only cares about that).
export const Populated: Story = {
  render: () => (
    <div className="w-[1440px]">
      <Demo />
    </div>
  ),
};

// README §6: axes/structure stay rendered, an InlineStatus banner carries the "nothing yet" copy.
export const Empty: Story = {
  render: () => (
    <div className="w-[1440px]">
      <Demo
        overrides={{
          emptyMessage: 'No usage yet. Usage appears here once your first request is billed.',
          statCards: overviewEmptyStatCards,
          spendSeries: [],
          latencySeries: [],
          budget: { value: 0, ceiling: 500, caption: 'account ceiling · 0% used · resets 01 Mar' },
          needsAttentionProject: undefined,
          refillRequestStatus: undefined,
        }}
      />
    </div>
  ),
};

// README §6 loading rules: `raised` skeleton blocks matching final geometry, no spinner/shimmer.
export const Loading: Story = {
  render: () => (
    <div className="w-[1440px]">
      <Demo
        overrides={{
          statCardsLoading: true,
          spendStatus: 'loading',
          latencyStatus: 'loading',
        }}
      />
    </div>
  ),
};

// README §6 error rules: section-level ErrorLine + Retry in the dashboard slots; a failed
// latency query must not take the spend chart down with it, so only LATENCY errors here.
export const DashboardError: Story = {
  render: () => (
    <div className="w-[1440px]">
      <Demo
        overrides={{
          latencyStatus: 'error',
          latencyErrorMessage: 'Failed to load latency data.',
          onRetryLatency: () => {},
        }}
      />
    </div>
  ),
};

export const MemberNav: Story = {
  name: 'Nav — member (no Admin group)',
  render: () => (
    <div className="w-[1440px]">
      <Demo overrides={{ showAdmin: false }} />
    </div>
  ),
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => (
    <div className="w-[1440px]">
      <Demo overrides={{ showAdmin: true }} />
    </div>
  ),
};

// `md` tier (600–1024): left rail persists inline, right rail docks as a BottomSheet — visually
// comparable to shell-compact.svg. A real viewport resize (not a wrapper `<div>`) is what
// exercises the `md:` classes now that the shell is CSS-tiered.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <Demo />,
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): single column,
// stacked stat cards, nav docked as a fixed bottom navigation bar, VIEW & FILTERS reachable via
// the right rail's BottomSheet peek row, SCOPE reachable via the header's drawer trigger, and
// the ledger-free layout here needs no horizontal-scroll proof (see the ApiKeys/Manage/Admin
// mobile stories for that).
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
