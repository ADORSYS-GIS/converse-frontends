import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuleSetForm } from './component';
import { ruleSetFieldExample } from './field-examples';
import {
  ruleSetFormEmpty,
  ruleSetFormErrors,
  ruleSetFormPopulated,
  ruleSetFormWithErrors,
  ruleSetFormWithGroupedRule,
} from './fixtures';

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

    const [call] = onChange.mock.calls[onChange.mock.calls.length - 1] as [
      typeof ruleSetFormPopulated,
    ];
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

    const [call] = onChange.mock.calls[onChange.mock.calls.length - 1] as [
      typeof ruleSetFormPopulated,
    ];
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

  // Issue #445 — examples are documentation that stays on screen while the author types.
  describe('field examples', () => {
    it('shows every per-field example line, not as a placeholder', () => {
      render(<RuleSetForm value={ruleSetFormWithGroupedRule} onChange={vi.fn()} />);

      for (const name of [
        'policyRevision',
        'allowedAmounts',
        'startingAmount',
        'failClosedFloorAmount',
        'defaultEffect',
        'defaultReasonCode',
        'ruleCondition',
      ] as const) {
        const example = ruleSetFieldExample(name);
        expect(example, `${name} declares no example`).toBeDefined();
        expect(screen.getAllByText(example as string).length).toBeGreaterThan(0);
      }

      // Per-rule examples repeat once per rule row, so assert them by count rather than by
      // uniqueness — the grouped fixture carries two rules, the second of them capped.
      expect(screen.getAllByText(ruleSetFieldExample('ruleId') as string)).toHaveLength(2);
      expect(screen.getAllByText(ruleSetFieldExample('ruleReasonCode') as string)).toHaveLength(2);
      expect(screen.getAllByText(ruleSetFieldExample('ruleCapAmount') as string)).toHaveLength(1);
    });

    it('associates a field example with its own control via aria-describedby', () => {
      render(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);

      const control = screen.getByLabelText('Policy revision');
      const describedBy = control.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const described = (describedBy as string)
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent);
      expect(described).toContain(ruleSetFieldExample('policyRevision'));
    });

    it('describes a hidden-label control group through the group itself, not loose text', () => {
      render(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);

      const ladder = screen.getByRole('group', { name: 'Refill ladder' });
      const describedBy = ladder.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)?.textContent).toBe(
        ruleSetFieldExample('allowedAmounts')
      );

      const conditions = screen.getByRole('group', { name: 'Conditions' });
      const conditionsDescribedBy = conditions.getAttribute('aria-describedby');
      expect(document.getElementById(conditionsDescribedBy as string)?.textContent).toBe(
        ruleSetFieldExample('ruleCondition')
      );
    });

    it('keeps the example visible once a value is typed — it is not a placeholder', () => {
      const { rerender } = render(<RuleSetForm value={ruleSetFormEmpty} onChange={vi.fn()} />);
      expect(screen.getByText(ruleSetFieldExample('policyRevision') as string)).toBeInTheDocument();

      rerender(<RuleSetForm value={ruleSetFormPopulated} onChange={vi.fn()} />);
      expect(screen.getByText(ruleSetFieldExample('policyRevision') as string)).toBeInTheDocument();
      expect(screen.getByLabelText('Policy revision')).not.toHaveAttribute('placeholder');
    });
  });
});
