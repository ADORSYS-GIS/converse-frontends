import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { presetRange } from '../../components/date-range-field';
import { OverviewControls } from './component';
import type { OverviewControlsField } from './types';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
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

    for (const label of ['Range', 'Bucket', 'Group by', 'Project']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('does NOT render an account control — scope is identity, and lives in the sidebar', () => {
    render(<OverviewControls {...base} />);

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('does NOT render a Model control — deleted this phase, it was permanently inert', () => {
    render(<OverviewControls {...base} />);

    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
  });

  it('does NOT render an Export action — deleted this phase, it was permanently disabled', () => {
    render(<OverviewControls {...base} />);

    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
  });

  it('renders the project control only when projectField is given', () => {
    const { projectField: _omit, ...withoutProject } = base;
    render(<OverviewControls {...withoutProject} />);

    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument();
  });

  it('changing a select calls that field own onChange with the new value', async () => {
    const onChange = vi.fn();
    render(
      <OverviewControls
        {...base}
        bucketField={field('Bucket', 'daily', BUCKET_OPTIONS, onChange)}
      />
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

  // 2026-09-03 (ADR 0015 amendment A2): this cluster is a FRAGMENT now, not its own landmark. The
  // `<section aria-label>` and the `flex flex-wrap items-end gap-3` it used to carry are
  // `PageControls`' — the page-level control row — so four sibling clusters stopped spelling the
  // same four utilities. What this asserts is that it did NOT keep a wrapper of its own.
  it('renders no wrapper of its own — `PageControls` owns the row', () => {
    const { container } = render(<OverviewControls {...base} />);

    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
