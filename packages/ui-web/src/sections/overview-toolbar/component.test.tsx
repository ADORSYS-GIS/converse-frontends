import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewToolbar } from './component';
import type { OverviewToolbarField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_OPTIONS,
} from './fixtures';

function field(
  label: string,
  value: string,
  options: OverviewToolbarField['options'],
  onChange = () => {}
): OverviewToolbarField {
  return { label, value, options, onChange };
}

const base = {
  rangeField: field('Range', 'last-30', RANGE_OPTIONS),
  bucketField: field('Bucket', 'daily', BUCKET_OPTIONS),
  groupByField: field('Group by', 'project-model', GROUP_BY_OPTIONS),
  projectField: field('Project', 'all', PROJECT_FILTER_OPTIONS),
  modelField: field('Model', 'all', MODEL_FILTER_OPTIONS),
};

describe('OverviewToolbar', () => {
  it('renders every parameter as a labelled control', () => {
    render(<OverviewToolbar {...base} />);

    for (const label of ['Range', 'Bucket', 'Group by', 'Project', 'Model']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('does NOT render an account control — scope is identity, and lives in the header', () => {
    render(<OverviewToolbar {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('changing a control calls that field own onChange with the new value', () => {
    const onChange = vi.fn();
    render(
      <OverviewToolbar {...base} rangeField={field('Range', 'last-30', RANGE_OPTIONS, onChange)} />
    );

    fireEvent.change(screen.getByLabelText('Range'), { target: { value: 'last-7' } });
    expect(onChange).toHaveBeenCalledWith('last-7');
  });

  it('renders the export action when it is available', () => {
    const onExport = vi.fn();
    render(<OverviewToolbar {...base} onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('renders export disabled, with a stated reason, rather than omitting it silently', () => {
    render(<OverviewToolbar {...base} exportDisabledReason="Export isn't available yet." />);

    const action = screen.getByRole('button', { name: 'Export CSV' });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('title', "Export isn't available yet.");
  });

  it('renders no export affordance at all when neither a handler nor a reason is given', () => {
    render(<OverviewToolbar {...base} />);

    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('is one landmark region, so the page never grows a second set of rail landmarks', () => {
    render(<OverviewToolbar {...base} />);

    expect(screen.getByRole('region', { name: 'View and filters' })).toBeInTheDocument();
  });
});
