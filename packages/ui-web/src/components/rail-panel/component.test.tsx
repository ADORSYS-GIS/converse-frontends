import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RailPanel } from './component';

describe('RailPanel', () => {
  it('renders its children', () => {
    render(<RailPanel>Panel content</RailPanel>);

    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders an uppercase label heading when provided', () => {
    render(<RailPanel label="SCOPE">Panel content</RailPanel>);

    expect(screen.getByText('SCOPE')).toBeInTheDocument();
  });

  it('omits the label heading when none is given', () => {
    render(<RailPanel>Panel content</RailPanel>);

    expect(screen.queryByText('SCOPE')).not.toBeInTheDocument();
  });

  it('applies only the 16px section inset — no background/radius of its own (owner revision, console-ui skill "Rails are flush…")', () => {
    render(<RailPanel>Panel content</RailPanel>);

    const panel = screen.getByText('Panel content');
    expect(panel).toHaveClass('p-4');
    expect(panel).not.toHaveClass('bg-surface');
    expect(panel).not.toHaveClass('rounded-[2px]');
  });

  it('merges a consumer className', () => {
    render(<RailPanel className="w-52">Panel content</RailPanel>);

    expect(screen.getByText('Panel content')).toHaveClass('w-52');
  });
});
