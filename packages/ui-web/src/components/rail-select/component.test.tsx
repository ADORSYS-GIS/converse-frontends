import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RailSelect } from './component';

const OPTIONS = [
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-30', label: 'Last 30 days' },
];

describe('RailSelect', () => {
  it('associates its label with the control', () => {
    render(<RailSelect label="Range" value="last-30" options={OPTIONS} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Range')).toHaveValue('last-30');
  });

  it('fires onChange with the selected value', () => {
    const onChange = vi.fn();
    render(<RailSelect label="Range" value="last-30" options={OPTIONS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Range'), { target: { value: 'last-7' } });

    expect(onChange).toHaveBeenCalledWith('last-7');
  });
});
