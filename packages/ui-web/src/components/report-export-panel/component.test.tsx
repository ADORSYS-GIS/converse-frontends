import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportExportPanel } from './component';
import type { ReportIncludeToggle } from './types';

const groupByOptions = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
];

const toggles: ReportIncludeToggle[] = [
  { id: 'per-model', label: 'Per-model breakdown', checked: true },
  { id: 'zero-usage', label: 'Include zero-usage projects', checked: false },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof ReportExportPanel>> = {}) {
  const onGenerate = vi.fn();
  const onToggleInclude = vi.fn();
  const onPeriodChange = vi.fn();
  const onGroupByChange = vi.fn();
  const onFormatChange = vi.fn();

  render(
    <ReportExportPanel
      period="2026-02"
      onPeriodChange={onPeriodChange}
      scopeSlot={<div>scope slot</div>}
      groupByOptions={groupByOptions}
      groupBy="project-model"
      onGroupByChange={onGroupByChange}
      includeToggles={toggles}
      onToggleInclude={onToggleInclude}
      format="csv"
      onFormatChange={onFormatChange}
      onGenerate={onGenerate}
      {...overrides}
    />
  );

  return { onGenerate, onToggleInclude, onPeriodChange, onGroupByChange, onFormatChange };
}

describe('ReportExportPanel', () => {
  it('renders the scope slot as provided', () => {
    renderPanel();
    expect(screen.getByText('scope slot')).toBeInTheDocument();
  });

  // Ticket #309: there is no real export-history source, so the panel no longer renders a LAST
  // EXPORTS section at all — neither a fabricated list nor a permanent "unwired"/"No exports yet."
  // placeholder (console-ui#326's original complaint about the latter).
  it('renders no export-history section — removed entirely, not emptied', () => {
    renderPanel();
    expect(screen.queryByText('Last exports')).not.toBeInTheDocument();
    expect(screen.queryByText('Export history is unwired.')).not.toBeInTheDocument();
    expect(screen.queryByText('No exports yet.')).not.toBeInTheDocument();
  });

  // console-ui#325 — pressing Generate report when report export isn't wired yet must not read
  // as an error: no `role="alert"`, no `Retry`, and the explanatory copy stays visible.
  it('renders a placeholder notice as a non-alert status with Dismiss, never Retry', () => {
    const onDismiss = vi.fn();
    renderPanel({ notice: { message: "Report export isn't available yet.", onDismiss } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("Report export isn't available yet.");
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('omits the notice entirely when none is given', () => {
    renderPanel();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fires onGenerate with the current period, groupBy, format and checked includes', () => {
    const { onGenerate } = renderPanel();

    screen.getByRole('button', { name: 'Generate report' }).click();

    expect(onGenerate).toHaveBeenCalledWith({
      period: '2026-02',
      groupBy: 'project-model',
      format: 'csv',
      includes: ['per-model'],
    });
  });

  it('disables the primary button while generating and swaps its label', () => {
    renderPanel({ generating: true });

    const button = screen.getByRole('button', { name: 'Generating…' });
    expect(button).toBeDisabled();
  });

  it('toggles an include switch and reports its id and next checked state', () => {
    const { onToggleInclude } = renderPanel();

    // Base UI `Switch.Root` (ADR 0010 Decision 4) renders `role="switch"`, not `role="checkbox"`.
    fireEvent.click(screen.getByRole('switch', { name: 'Include zero-usage projects' }));

    expect(onToggleInclude).toHaveBeenCalledWith('zero-usage', true);
  });

  it('changes the group-by segmented control', () => {
    const { onGroupByChange } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Project' }));

    expect(onGroupByChange).toHaveBeenCalledWith('project');
  });
});

/**
 * The DASHBOARD-page shape (converse-frontends#453): the period picker, the scope slot and the
 * group-by control are ABSENT, not disabled — a dashboard report's window comes from the page's
 * own range picker (echoed read-only), its scope from the route, and its grouping from
 * `dashboards.yaml`. A control that appeared to change any of those would be lying.
 */
describe('ReportExportPanel — dashboard page export', () => {
  function renderDashboardPanel(
    overrides: Partial<React.ComponentProps<typeof ReportExportPanel>> = {}
  ) {
    const onGenerate = vi.fn();
    const onToggleInclude = vi.fn();
    const onFormatChange = vi.fn();
    render(
      <ReportExportPanel
        rangeEcho="This month · 1 – 14 Sep 2026 · UTC"
        includeToggles={[{ id: 'tables', label: 'Include tables', checked: true }]}
        onToggleInclude={onToggleInclude}
        format="pdf"
        onFormatChange={onFormatChange}
        onGenerate={onGenerate}
        {...overrides}
      />
    );
    return { onGenerate, onToggleInclude, onFormatChange };
  }

  it('echoes the range as text and offers no period, scope or group-by control', () => {
    renderDashboardPanel();

    expect(screen.getByText('This month · 1 – 14 Sep 2026 · UTC')).toBeInTheDocument();
    expect(screen.queryByLabelText('Period')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Group by' })).not.toBeInTheDocument();
    expect(screen.queryByText('Group by')).not.toBeInTheDocument();
  });

  it('still generates, reporting the format and the include toggles and nothing else', () => {
    const { onGenerate } = renderDashboardPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(onGenerate).toHaveBeenCalledWith({
      period: undefined,
      groupBy: undefined,
      format: 'pdf',
      includes: ['tables'],
    });
  });

  it('renders a failure as a retryable ErrorLine while keeping every input', () => {
    const onRetry = vi.fn();
    renderDashboardPanel({
      error: { message: 'The report renderer is unreachable.', onRetry },
    });

    expect(screen.getByText('The report renderer is unreachable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
    // The form is intact: the format control and the primary are both still there.
    expect(screen.getByRole('button', { name: 'Generate report' })).toBeInTheDocument();
    expect(screen.getByText('This month · 1 – 14 Sep 2026 · UTC')).toBeInTheDocument();
  });
});
