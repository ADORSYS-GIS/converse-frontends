import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScenarioForm } from './component';
import { scenarioFormErrors, scenarioFormPopulated, scenarioFormWithErrors } from './fixtures';

describe('ScenarioForm', () => {
  it('renders no textarea anywhere', () => {
    render(<ScenarioForm value={scenarioFormPopulated} onChange={vi.fn()} />);
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('shows the spend-this-period amount field when known', () => {
    render(<ScenarioForm value={scenarioFormPopulated} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Spend this period (USD)')).toBeInTheDocument();
  });

  it('shows an unavailable caption, not an amount field, when spend last period is unknown', () => {
    render(<ScenarioForm value={scenarioFormPopulated} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Spend last period (USD)')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Treated as unavailable/)).toHaveLength(1);
  });

  it('toggling Known for spend last period fires onChange', () => {
    const onChange = vi.fn();
    render(<ScenarioForm value={scenarioFormPopulated} onChange={onChange} />);

    const knownBoxes = screen.getAllByRole('checkbox', { name: 'Known' });
    fireEvent.click(knownBoxes[1]);

    expect(onChange).toHaveBeenCalledWith({
      ...scenarioFormPopulated,
      spendLastPeriodKnown: true,
    });
  });

  it('edits the effective balance field', () => {
    const onChange = vi.fn();
    render(<ScenarioForm value={scenarioFormPopulated} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Effective balance (USD)'), {
      target: { value: '99' },
    });

    expect(onChange).toHaveBeenCalledWith({ ...scenarioFormPopulated, effectiveBalance: '99' });
  });

  it('renders field-level errors against their own control', () => {
    render(
      <ScenarioForm value={scenarioFormWithErrors} onChange={vi.fn()} errors={scenarioFormErrors} />
    );
    expect(screen.getByText('Enter a non-negative amount.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number, 0 or greater.')).toBeInTheDocument();
  });
});
