import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { presetRange } from '../../components/date-range-field';
import { OverviewControls } from './component';
import type { OverviewControlsField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_PRESETS,
} from './fixtures';

function field(
  label: string,
  value: string,
  options: OverviewControlsField['options'],
  onChange = () => {}
): OverviewControlsField {
  return { label, value, options, onChange };
}

const TODAY = new Date(Date.UTC(2026, 7, 29));

const rangeField = {
  label: 'Range',
  preset: '30d' as string | null,
  presets: RANGE_PRESETS,
  value: presetRange(30, TODAY),
  today: TODAY,
  onPresetChange: () => {},
  onRangeChange: () => {},
};

const base = {
  rangeField,
  bucketField: field('Bucket', 'daily', BUCKET_OPTIONS),
  groupByField: field('Group by', 'project-model', GROUP_BY_OPTIONS),
  projectField: field('Project', 'all', PROJECT_FILTER_OPTIONS),
  modelField: field('Model', 'all', MODEL_FILTER_OPTIONS),
};

// Base UI `Select.Item` commits only when a real `pointerdown` preceded the click on the same
// item -- see `scope-select/component.test.tsx`.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('OverviewControls', () => {
  it('renders every parameter as a labelled control', () => {
    render(<OverviewControls {...base} />);

    for (const label of ['Range', 'Bucket', 'Group by', 'Project', 'Model']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('does NOT render an account control — scope is identity, and lives in the header', () => {
    render(<OverviewControls {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('changing a select calls that field own onChange with the new value', async () => {
    const onChange = vi.fn();
    render(
      <OverviewControls {...base} bucketField={field('Bucket', 'daily', BUCKET_OPTIONS, onChange)} />
    );

    fireEvent.click(screen.getByLabelText('Bucket'));
    selectOption(await screen.findByRole('option', { name: 'Hourly' }));

    expect(onChange).toHaveBeenCalledWith('hourly');
  });

  it('range is a date-range picker, not a three-option dropdown', async () => {
    const onPresetChange = vi.fn();
    render(<OverviewControls {...base} rangeField={{ ...rangeField, onPresetChange }} />);

    fireEvent.click(screen.getByLabelText('Range'));
    expect(await screen.findAllByRole('grid')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(onPresetChange).toHaveBeenCalledWith('7d');
  });

  it('renders the export action when it is available', () => {
    const onExport = vi.fn();
    render(<OverviewControls {...base} onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('renders export disabled, with a stated reason, rather than omitting it silently', () => {
    render(<OverviewControls {...base} exportDisabledReason="Export isn't available yet." />);

    const action = screen.getByRole('button', { name: 'Export CSV' });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('title', "Export isn't available yet.");
  });

  it('renders no export affordance at all when neither a handler nor a reason is given', () => {
    render(<OverviewControls {...base} />);

    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('is one landmark region, so the page never grows a second set of rail landmarks', () => {
    render(<OverviewControls {...base} />);

    expect(screen.getByRole('region', { name: 'View and filters' })).toBeInTheDocument();
  });
});
