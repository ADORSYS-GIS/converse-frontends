import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { manageStatusOptions } from '../manage-filters-rail/fixtures';
import { MANAGE_REPORT_RAIL_LABEL, ManageReportRail } from './component';
import { manageLastExports } from './fixtures';
import type { ManageReportRailProps } from './types';

function makeProps(overrides: Partial<ManageReportRailProps> = {}): ManageReportRailProps {
  return {
    period: '2026-02',
    onPeriodChange: vi.fn(),
    scopeSlot: <span>scope</span>,
    groupByOptions: manageStatusOptions,
    groupBy: 'all',
    onGroupByChange: vi.fn(),
    includeToggles: [{ id: 'totals', label: 'Totals row', checked: true }],
    onToggleInclude: vi.fn(),
    format: 'csv',
    onFormatChange: vi.fn(),
    onGenerate: vi.fn(),
    lastExports: manageLastExports,
    ...overrides,
  };
}

describe('ManageReportRail', () => {
  it('exposes the label the rail and its compact-tier sheet both read', () => {
    expect(MANAGE_REPORT_RAIL_LABEL).toBe('Monthly report');
  });

  it('fires onGenerate with the composed export params', () => {
    const onGenerate = vi.fn();
    render(<ManageReportRail {...makeProps({ onGenerate })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('disables only the primary while generating', () => {
    render(<ManageReportRail {...makeProps({ generating: true })} />);

    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
  });
});
