import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineStatus } from './component';

describe('InlineStatus', () => {
  it('renders its content as a status line', () => {
    render(<InlineStatus>23 active · 4 revoked</InlineStatus>);

    expect(screen.getByRole('status')).toHaveTextContent('23 active · 4 revoked');
  });

  it('announces itself politely for assistive tech', () => {
    render(<InlineStatus>No keys yet.</InlineStatus>);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders a trailing action when given', () => {
    render(
      <InlineStatus action={<button type="button">Reset filters</button>}>
        No keys match the current filters.
      </InlineStatus>
    );

    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });

  it('omits the action slot when none is given', () => {
    render(<InlineStatus>No usage in this range.</InlineStatus>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
