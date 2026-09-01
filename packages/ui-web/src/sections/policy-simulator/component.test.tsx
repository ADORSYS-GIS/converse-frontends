import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PolicySimulator } from './component';
import { policySimulatorBase, policySimulatorError, policySimulatorResult } from './fixtures';

describe('PolicySimulator', () => {
  it('renders no textarea anywhere — the whole point of the redesign', () => {
    render(<PolicySimulator {...policySimulatorBase} />);
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('composes RuleSetForm and ScenarioForm, both editable', () => {
    render(<PolicySimulator {...policySimulatorBase} />);
    expect(screen.getByLabelText('Policy revision')).toBeInTheDocument();
    expect(screen.getByLabelText('Effective balance (USD)')).toBeInTheDocument();
  });

  it('fires onSubmit from the Simulate action', () => {
    const onSubmit = vi.fn();
    render(<PolicySimulator {...policySimulatorBase} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Simulate' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders no Decision block until a simulation has actually run', () => {
    render(<PolicySimulator {...policySimulatorBase} />);

    expect(screen.queryByText('Decision')).not.toBeInTheDocument();
  });

  it('renders the returned Decision — effect, amounts, revision, reason codes', () => {
    render(<PolicySimulator {...policySimulatorResult} />);

    expect(screen.getByText('Decision')).toBeInTheDocument();
    expect(screen.getByText('auto_approve')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('budget-policy-v1')).toBeInTheDocument();
    expect(screen.getByText(/within_unaided_allowance/)).toBeInTheDocument();
  });

  it('surfaces a submit-time error inline', () => {
    render(<PolicySimulator {...policySimulatorError} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The simulation call failed — try again.');
  });

  it('propagates edits from RuleSetForm up through onRuleSetChange', () => {
    const onRuleSetChange = vi.fn();
    render(<PolicySimulator {...policySimulatorBase} onRuleSetChange={onRuleSetChange} />);

    fireEvent.change(screen.getByLabelText('Policy revision'), {
      target: { value: 'budget-policy-v2' },
    });

    expect(onRuleSetChange).toHaveBeenCalledWith({
      ...policySimulatorBase.ruleSet,
      policyRevision: 'budget-policy-v2',
    });
  });

  it('propagates edits from ScenarioForm up through onScenarioChange', () => {
    const onScenarioChange = vi.fn();
    render(<PolicySimulator {...policySimulatorBase} onScenarioChange={onScenarioChange} />);

    fireEvent.change(screen.getByLabelText('Effective balance (USD)'), {
      target: { value: '99' },
    });

    expect(onScenarioChange).toHaveBeenCalledWith({
      ...policySimulatorBase.scenario,
      effectiveBalance: '99',
    });
  });
});
