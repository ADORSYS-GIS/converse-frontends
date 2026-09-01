import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './component';

describe('Card', () => {
  it('renders children with no head row when neither title nor actions are given', () => {
    const { container } = render(<Card>Body content</Card>);

    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(container.querySelector('.card-head')).not.toBeInTheDocument();
  });

  it('renders the title inside the head row', () => {
    render(<Card title="Usage this month">Body</Card>);

    expect(screen.getByRole('heading', { name: 'Usage this month' })).toBeInTheDocument();
  });

  it('renders actions in the head row even without a title', () => {
    render(<Card actions={<button type="button">Export</button>}>Body</Card>);

    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('carries the console-card surface class', () => {
    const { container } = render(<Card>Body</Card>);

    expect(container.firstElementChild).toHaveClass('console-card');
  });

  it('forwards a caller className alongside the surface class', () => {
    const { container } = render(<Card className="mt-4">Body</Card>);

    expect(container.firstElementChild).toHaveClass('console-card', 'mt-4');
  });
});
