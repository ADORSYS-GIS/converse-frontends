import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RefillPolicyLookup } from './component';
import {
  refillPolicyLookupEmpty,
  refillPolicyLookupError,
  refillPolicyLookupReady,
} from './fixtures';

describe('RefillPolicyLookup', () => {
  it('renders the honest unavailable caption with no id entered', () => {
    render(<RefillPolicyLookup {...refillPolicyLookupEmpty} />);
    expect(screen.getByText(/No known policy set id/)).toBeInTheDocument();
  });

  it('calls onChange as the id is typed', () => {
    const onChange = vi.fn();
    render(<RefillPolicyLookup {...refillPolicyLookupEmpty} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Policy set id'), { target: { value: 'x' } });
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('offers no action button before the lookup is ready', () => {
    render(<RefillPolicyLookup {...refillPolicyLookupError} />);
    expect(
      screen.queryByRole('button', { name: /Author a replacement revision/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Simulate against this policy/ })
    ).not.toBeInTheDocument();
  });

  it('offers both actions once the lookup is ready, and never a dead disabled control', () => {
    render(<RefillPolicyLookup {...refillPolicyLookupReady} />);
    expect(screen.getByRole('button', { name: /Author a replacement revision/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Simulate against this policy/ })).toBeEnabled();
  });

  it('fires onEditRevision/onSimulate on press', () => {
    const onEditRevision = vi.fn();
    const onSimulate = vi.fn();
    render(
      <RefillPolicyLookup
        {...refillPolicyLookupReady}
        onEditRevision={onEditRevision}
        onSimulate={onSimulate}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Author a replacement revision/ }));
    fireEvent.click(screen.getByRole('button', { name: /Simulate against this policy/ }));
    expect(onEditRevision).toHaveBeenCalledTimes(1);
    expect(onSimulate).toHaveBeenCalledTimes(1);
  });

  it('omits an action entirely, rather than disabling it, when the caller has no handler', () => {
    render(<RefillPolicyLookup {...refillPolicyLookupReady} onSimulate={undefined} />);
    expect(
      screen.getByRole('button', { name: /Author a replacement revision/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Simulate against this policy/ })
    ).not.toBeInTheDocument();
  });
});
