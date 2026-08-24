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
      lastExports={[{ filename: '2026-01 · CSV', date: '4 d ago' }]}
      {...overrides}
    />,
  );

  return { onGenerate, onToggleInclude, onPeriodChange, onGroupByChange, onFormatChange };
}

describe('ReportExportPanel', () => {
  it('renders the scope slot as provided', () => {
    renderPanel();
    expect(screen.getByText('scope slot')).toBeInTheDocument();
  });

  it('renders the last exports list as mono filename · date rows', () => {
    renderPanel();
    expect(screen.getByText('2026-01 · CSV')).toBeInTheDocument();
    expect(screen.getByText('4 d ago')).toBeInTheDocument();
  });

  it('shows a fallback line when there are no exports yet', () => {
    renderPanel({ lastExports: [] });
    expect(screen.getByText('No exports yet.')).toBeInTheDocument();
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

  it('toggles an include checkbox and reports its id and next checked state', () => {
    const { onToggleInclude } = renderPanel();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include zero-usage projects' }));

    expect(onToggleInclude).toHaveBeenCalledWith('zero-usage', true);
  });

  it('changes the group-by segmented control', () => {
    const { onGroupByChange } = renderPanel();

    fireEvent.click(screen.getByRole('radio', { name: 'Project' }));

    expect(onGroupByChange).toHaveBeenCalledWith('project');
  });
});
