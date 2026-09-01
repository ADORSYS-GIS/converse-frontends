import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeField, formatDateRange, presetRange } from './component';
import type { DateRangePreset } from './types';

const TODAY = new Date(Date.UTC(2026, 7, 29));
const PRESETS: DateRangePreset[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
];

function renderField(overrides: Partial<React.ComponentProps<typeof DateRangeField>> = {}) {
  const props = {
    label: 'Range',
    presets: PRESETS,
    preset: '30d' as string | null,
    value: presetRange(30, TODAY),
    today: TODAY,
    onPresetChange: vi.fn(),
    onRangeChange: vi.fn(),
    ...overrides,
  };
  render(<DateRangeField {...props} />);
  return props;
}

describe('presetRange', () => {
  it('spans `days` inclusive of today', () => {
    expect(presetRange(7, TODAY)).toEqual({
      from: new Date(Date.UTC(2026, 7, 23)),
      to: TODAY,
    });
  });

  it("spans the calendar month for 'mtd', not a rolling window", () => {
    expect(presetRange('mtd', TODAY)).toEqual({
      from: new Date(Date.UTC(2026, 7, 1)),
      to: TODAY,
    });
  });

  it("'mtd' on the 1st of the month is a same-day span, not the prior month", () => {
    const firstOfMonth = new Date(Date.UTC(2026, 7, 1, 0, 30));
    expect(presetRange('mtd', firstOfMonth)).toEqual({
      from: new Date(Date.UTC(2026, 7, 1)),
      to: firstOfMonth,
    });
  });
});

describe('formatDateRange', () => {
  it('renders a span', () => {
    expect(formatDateRange({ from: new Date(Date.UTC(2026, 7, 12)), to: TODAY })).toBe(
      '12 Aug – 29 Aug'
    );
  });

  it('collapses a single-day span to one date', () => {
    expect(formatDateRange({ from: TODAY, to: TODAY })).toBe('29 Aug');
  });
});

describe('DateRangeField', () => {
  it('shows the active preset label on the trigger', () => {
    renderField();
    expect(screen.getByLabelText('Range')).toHaveTextContent('Last 30 days');
  });

  it('shows the dates themselves when the range is custom', () => {
    renderField({
      preset: null,
      value: { from: new Date(Date.UTC(2026, 7, 12)), to: new Date(Date.UTC(2026, 7, 20)) },
    });
    expect(screen.getByLabelText('Range')).toHaveTextContent('12 Aug – 20 Aug');
  });

  it('offers the presets and a calendar once opened', async () => {
    renderField();
    fireEvent.click(screen.getByLabelText('Range'));

    expect(await screen.findByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getAllByRole('grid')).toHaveLength(2);
  });

  it('reports a preset choice', async () => {
    const props = renderField();
    fireEvent.click(screen.getByLabelText('Range'));
    fireEvent.click(await screen.findByRole('button', { name: 'Last 7 days' }));

    expect(props.onPresetChange).toHaveBeenCalledWith('7d');
  });

  it('does not offer days after today', async () => {
    renderField();
    fireEvent.click(screen.getByLabelText('Range'));
    await screen.findAllByRole('grid');

    const tomorrow = screen.queryByRole('button', { name: /30th August 2026/ });
    expect(tomorrow === null || tomorrow.hasAttribute('disabled')).toBe(true);
  });
});
