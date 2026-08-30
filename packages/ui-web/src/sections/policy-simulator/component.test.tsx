import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PolicySimulator } from './component';
import { policySimulatorBase, policySimulatorError, policySimulatorResult } from './fixtures';

describe('PolicySimulator', () => {
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
    expect(screen.getByText('allow')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('rev_3')).toBeInTheDocument();
    expect(screen.getByText(/within_limit/)).toBeInTheDocument();
  });

  it('surfaces a submit-time error (e.g. malformed JSON) inline', () => {
    render(<PolicySimulator {...policySimulatorError} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Rule data is not valid JSON.');
  });

  it('propagates edits to the rule-data and scenario textareas', () => {
    const onRuleDataJsonChange = vi.fn();
    render(<PolicySimulator {...policySimulatorBase} onRuleDataJsonChange={onRuleDataJsonChange} />);

    fireEvent.change(screen.getByLabelText('Rule data (JSON)'), {
      target: { value: '{"rules":[{"id":"r1"}]}' },
    });

    expect(onRuleDataJsonChange).toHaveBeenCalledWith('{"rules":[{"id":"r1"}]}');
  });
});
