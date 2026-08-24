import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  overviewBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewSpendSeries,
  overviewStatCards,
} from './fixtures';

const navItems: NavSpineItem[] = [{ key: 'overview', label: 'Overview', active: true }];
const adminNavItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin' }];

function selectField(label: string, value: string, options: OverviewSelectField['options']): OverviewSelectField {
  return { label, value, options, onChange: vi.fn() };
}

function makeProps(overrides: Partial<OverviewPageProps> = {}): OverviewPageProps {
  return {
    orgName: 'adorsys-gis',
    userEmail: 'sam@adorsys.com',
    userInitials: 'SL',
    navItems,
    adminNavItems,
    showAdmin: false,
    scopeAccountLabel: 'adorsys-gis',
    scopeProjectLabel: 'all projects',
    scopeSubline: 'adorsys-gis · last 30 days · UTC',
    statCards: overviewStatCards,
    spendSeries: overviewSpendSeries,
    spendChartWidth: 872,
    spendChartHeight: 176,
    latencySeries: [],
    latencyChartWidth: 528,
    latencyChartHeight: 310,
    budget: overviewBudget,
    needsAttentionProject: overviewNeedsAttentionProject,
    refillRequestStatus: overviewRefillRequestStatus,
    rangeField: selectField('Range', 'last-30', RANGE_OPTIONS),
    bucketField: selectField('Bucket', 'daily', BUCKET_OPTIONS),
    groupByField: selectField('Group by', 'project-model', GROUP_BY_OPTIONS),
    accountFilterField: selectField('Account', 'adorsys-gis', ACCOUNT_FILTER_OPTIONS),
    projectFilterField: selectField('Project', 'all', PROJECT_FILTER_OPTIONS),
    modelFilterField: selectField('Model', 'all', MODEL_FILTER_OPTIONS),
    ...overrides,
  };
}

describe('OverviewPage', () => {
  it('hides the Admin nav group for a member (role gating)', () => {
    render(<OverviewPage {...makeProps({ showAdmin: false })} />);

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the Admin nav group for an admin', () => {
    render(<OverviewPage {...makeProps({ showAdmin: true })} />);

    // ConsoleShell renders `nav` twice — a rail NavSpine and a bottom-bar NavSpine, CSS-hidden
    // per tier — so "Admin" legitimately appears in both.
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    // ROLE only has a home in the `rail` layout (no room for it in a 56px horizontal strip).
    expect(screen.getByText('ROLE')).toBeInTheDocument();
  });

  it('renders the page title and scope subline', () => {
    render(<OverviewPage {...makeProps()} />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis · last 30 days · UTC')).toBeInTheDocument();
  });

  it('fires onRequestRefill when the NEEDS ATTENTION action is clicked', () => {
    const onRequestRefill = vi.fn();
    render(<OverviewPage {...makeProps({ onRequestRefill })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Request refill' }));

    expect(onRequestRefill).toHaveBeenCalledTimes(1);
  });

  it('fires onReviewInAdmin when the refill-request status link is clicked', () => {
    const onReviewInAdmin = vi.fn();
    render(<OverviewPage {...makeProps({ onReviewInAdmin })} />);

    fireEvent.click(screen.getByRole('button', { name: /Review in Admin/ }));

    expect(onReviewInAdmin).toHaveBeenCalledTimes(1);
  });

  it('wires the right-rail SERIES panel to onSelectSeries', () => {
    const onSelectSeries = vi.fn();
    render(<OverviewPage {...makeProps({ onSelectSeries })} />);

    const seriesPanel = screen.getByRole('region', { name: 'Series' });
    fireEvent.click(within(seriesPanel).getByRole('button', { name: 'claude-sonnet' }));

    expect(onSelectSeries).toHaveBeenCalledWith('claude-sonnet');
  });

  it('fires the range field onChange when a new option is selected', () => {
    const onChange = vi.fn();
    render(
      <OverviewPage
        {...makeProps({ rangeField: { ...selectField('Range', 'last-30', RANGE_OPTIONS), onChange } })}
      />,
    );

    fireEvent.change(screen.getByLabelText('Range'), { target: { value: 'last-7' } });

    expect(onChange).toHaveBeenCalledWith('last-7');
  });

  it('replaces the latency dashboard with an ErrorLine + Retry on failure, without touching spend', () => {
    const onRetryLatency = vi.fn();
    render(
      <OverviewPage
        {...makeProps({
          latencyStatus: 'error',
          latencyErrorMessage: 'Failed to load latency data.',
          onRetryLatency,
        })}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Failed to load latency data.')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetryLatency).toHaveBeenCalledTimes(1);

    // The spend dashboard has its own status and stays rendered normally.
    expect(screen.getByText('SPEND — BY PROJECT AND MODEL')).toBeInTheDocument();
  });

  it('renders skeletons instead of the real dashboards while loading', () => {
    render(<OverviewPage {...makeProps({ statCardsLoading: true, spendStatus: 'loading' })} />);

    expect(screen.getAllByText('Querying usage…').length).toBeGreaterThan(0);
    // The real spend chart never mounts while loading, so its own internal legend (distinct
    // from the always-present right-rail SERIES panel) does not render a second copy. The
    // right rail's BottomSheet copy only mounts once expanded (collapsed shows the peek row),
    // so the inline rail is the only copy present here.
    expect(screen.getAllByRole('button', { name: 'claude-sonnet' })).toHaveLength(1);
  });

  it('renders an InlineStatus banner for the page-level empty state', () => {
    render(
      <OverviewPage
        {...makeProps({ emptyMessage: 'No usage yet. Usage appears here once your first request is billed.' })}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No usage yet.');
  });

  it('omits the NEEDS ATTENTION and REFILL REQUESTS blocks when not provided', () => {
    render(
      <OverviewPage
        {...makeProps({ needsAttentionProject: undefined, refillRequestStatus: undefined })}
      />,
    );

    expect(screen.queryByText('NEEDS ATTENTION')).not.toBeInTheDocument();
    expect(screen.queryByText('REFILL REQUESTS')).not.toBeInTheDocument();
  });
});
