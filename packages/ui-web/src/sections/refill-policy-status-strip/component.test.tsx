import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefillPolicyStatusStrip } from './component';
import {
  refillPolicyStatusError,
  refillPolicyStatusReady,
  refillPolicyStatusUnavailable,
} from './fixtures';

describe('RefillPolicyStatusStrip', () => {
  it('renders the active policy set and revision as one mono line, not a placard', () => {
    render(<RefillPolicyStatusStrip {...refillPolicyStatusReady} />);
    expect(screen.getByText(/budget-refill/)).toBeInTheDocument();
    expect(screen.getByText(/budget-policy-v1/)).toBeInTheDocument();
  });

  it('always states the rule-content read-API gap beside the ready state', () => {
    render(<RefillPolicyStatusStrip {...refillPolicyStatusReady} />);
    expect(screen.getByText(/converse-frontends#368/)).toBeInTheDocument();
  });

  it('renders an inline unavailable caption, not a fabricated revision', () => {
    render(<RefillPolicyStatusStrip {...refillPolicyStatusUnavailable} />);
    expect(screen.getByText(/No known policy set id/)).toBeInTheDocument();
    expect(screen.queryByText(/budget-policy-v1/)).not.toBeInTheDocument();
  });

  it('surfaces an error with retry', () => {
    render(<RefillPolicyStatusStrip {...refillPolicyStatusError} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the active policy status.');
  });
});
