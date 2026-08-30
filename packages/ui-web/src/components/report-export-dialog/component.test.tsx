import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportExportDialog } from './component';
import type { ReportIncludeToggle } from '../report-export-panel';

const groupByOptions = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
];

const toggles: ReportIncludeToggle[] = [
  { id: 'totals', label: 'Totals row', checked: true },
];

function baseProps(
  overrides: Partial<React.ComponentProps<typeof ReportExportDialog>> = {}
): React.ComponentProps<typeof ReportExportDialog> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    period: '2026-02',
    onPeriodChange: vi.fn(),
    scopeSlot: <div>scope slot</div>,
    groupByOptions,
    groupBy: 'project-model',
    onGroupByChange: vi.fn(),
    includeToggles: toggles,
    onToggleInclude: vi.fn(),
    format: 'csv',
    onFormatChange: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };
}

describe('ReportExportDialog', () => {
  it('renders nothing when closed', () => {
    render(<ReportExportDialog {...baseProps({ open: false })} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the "Monthly report" title and hosts ReportExportPanel when open', () => {
    render(<ReportExportDialog {...baseProps()} />);

    expect(screen.getByRole('dialog', { name: 'Monthly report' })).toBeInTheDocument();
    expect(screen.getByText('scope slot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate report' })).toBeInTheDocument();
  });

  it('fires onOpenChange(false) on Escape', () => {
    const onOpenChange = vi.fn();
    render(<ReportExportDialog {...baseProps({ onOpenChange })} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('still fires onGenerate through the hosted panel', () => {
    const onGenerate = vi.fn();
    render(<ReportExportDialog {...baseProps({ onGenerate })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(onGenerate).toHaveBeenCalledWith({
      period: '2026-02',
      groupBy: 'project-model',
      format: 'csv',
      includes: ['totals'],
    });
  });
});
