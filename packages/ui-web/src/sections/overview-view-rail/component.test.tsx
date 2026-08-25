import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from './component';
import { BUCKET_OPTIONS, GROUP_BY_OPTIONS, RANGE_OPTIONS } from './fixtures';

function props(onRangeChange = vi.fn()) {
  return {
    rangeField: {
      label: 'Range',
      value: 'last-30',
      options: RANGE_OPTIONS,
      onChange: onRangeChange,
    },
    bucketField: { label: 'Bucket', value: 'daily', options: BUCKET_OPTIONS, onChange: vi.fn() },
    groupByField: {
      label: 'Group by',
      value: 'project-model',
      options: GROUP_BY_OPTIONS,
      onChange: vi.fn(),
    },
  };
}

describe('OverviewViewRail', () => {
  it('exposes an a11y region and its three controls', () => {
    render(<OverviewViewRail {...props()} />);

    expect(screen.getByRole('region', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByLabelText('Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Bucket')).toBeInTheDocument();
    expect(screen.getByLabelText('Group by')).toBeInTheDocument();
  });

  it('fires the range field onChange when a new option is selected', () => {
    const onChange = vi.fn();
    render(<OverviewViewRail {...props(onChange)} />);

    fireEvent.change(screen.getByLabelText('Range'), { target: { value: 'last-7' } });

    expect(onChange).toHaveBeenCalledWith('last-7');
  });

  it('renders no heading of its own — the host supplies it from the exported label', () => {
    render(<OverviewViewRail {...props()} />);

    expect(screen.queryByText(OVERVIEW_VIEW_RAIL_LABEL)).not.toBeInTheDocument();
  });
});
