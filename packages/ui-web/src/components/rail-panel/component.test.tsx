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

  it('applies the panel surface treatment', () => {
    render(<RailPanel>Panel content</RailPanel>);

    const panel = screen.getByText('Panel content');
    expect(panel).toHaveClass('bg-surface');
    expect(panel).toHaveClass('rounded-[2px]');
    expect(panel).toHaveClass('p-4');
  });

  it('merges a consumer className', () => {
    render(<RailPanel className="w-52">Panel content</RailPanel>);

    expect(screen.getByText('Panel content')).toHaveClass('w-52');
  });
});
