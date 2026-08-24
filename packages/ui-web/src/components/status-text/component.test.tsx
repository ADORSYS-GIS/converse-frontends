import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusText } from './component';

describe('StatusText', () => {
  it('renders as plain text, not a pill', () => {
    render(<StatusText tone="active">active</StatusText>);

    const el = screen.getByText('active');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).not.toMatch(/rounded-full/);
  });

  it('applies the soft tone for active by default', () => {
    render(<StatusText>active</StatusText>);

    expect(screen.getByText('active')).toHaveClass('text-soft');
  });

  it('applies the subtle tone for revoked/archived', () => {
    render(<StatusText tone="muted">revoked</StatusText>);

    expect(screen.getByText('revoked')).toHaveClass('text-subtle');
  });

  it('applies the signal tone for expiring/near-ceiling', () => {
    render(<StatusText tone="attention">expiring in 6 days</StatusText>);

    expect(screen.getByText('expiring in 6 days')).toHaveClass('text-primary');
  });
});
