import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuleSetForm } from './component';
import { ruleSetFormErrors, ruleSetFormPopulated, ruleSetFormWithErrors } from './fixtures';

describe('RuleSetForm', () => {
  it('renders no textarea anywhere — the whole point of this component', () => {
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('edits the policy revision field', () => {
    const onChange = vi.fn();
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Policy revision'), {
      target: { value: 'budget-policy-v2' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...ruleSetFormPopulated,
      policyRevision: 'budget-policy-v2',
    });
  });

  it('adds a new ladder step', () => {
    const onChange = vi.fn();
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add step' }));

    expect(onChange).toHaveBeenCalledWith({
      ...ruleSetFormPopulated,
      allowedAmounts: [...ruleSetFormPopulated.allowedAmounts, ''],
    });
  });

  it('removes a ladder step', () => {
    const onChange = vi.fn();
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove step 1' }));

    expect(onChange).toHaveBeenCalledWith({
      ...ruleSetFormPopulated,
      allowedAmounts: ruleSetFormPopulated.allowedAmounts.slice(1),
    });
  });

  it('adds a blank rule with + Add rule', () => {
    const onChange = vi.fn();
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add rule' }));

    const [call] = onChange.mock.calls[onChange.mock.calls.length - 1] as [typeof ruleSetFormPopulated];
    expect(call.rules).toHaveLength(2);
    expect(call.rules[1]).toMatchObject({ id: '', effect: 'auto_approve' });
  });

  it('only shows the cap amount field when the effect is auto_approve_capped', () => {
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Cap amount (USD)')).not.toBeInTheDocument();
  });

  it('only shows the combinator select once a rule has two or more conditions', () => {
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Match')).not.toBeInTheDocument();
  });

  it('adds a second condition, revealing the combinator select', () => {
    const onChange = vi.fn();
    render(<RuleSetForm value={ruleSetFormPopulated} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add condition' }));

    const [call] = onChange.mock.calls[onChange.mock.calls.length - 1] as [typeof ruleSetFormPopulated];
    expect(call.rules[0].condition.thresholds).toHaveLength(2);
  });

  it('renders field-level errors against their own control', () => {
    render(
      <RuleSetForm value={ruleSetFormWithErrors} onChange={vi.fn()} errors={ruleSetFormErrors} />
    );

    expect(screen.getByText('Policy revision must not be empty.')).toBeInTheDocument();
    expect(
      screen.getByText(/fail-closed floor must not exceed the starting amount/)
    ).toBeInTheDocument();
    expect(screen.getByText('Refill steps must be strictly ascending.')).toBeInTheDocument();
  });
});
