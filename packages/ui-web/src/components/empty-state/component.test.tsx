import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './component';

describe('EmptyState', () => {
  it('renders the headline', () => {
    render(<EmptyState headline="No api keys yet" />);

    expect(screen.getByText('No api keys yet')).toBeInTheDocument();
  });

  it('omits the explainer when none is given', () => {
    const { container } = render(<EmptyState headline="No api keys yet" />);

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('renders the explainer under the headline', () => {
    render(
      <EmptyState headline="No api keys yet" explainer="Create one to start calling the API." />
    );

    expect(screen.getByText('Create one to start calling the API.')).toBeInTheDocument();
  });

  it('renders the one action slot', () => {
    render(
      <EmptyState headline="No api keys yet" action={<button type="button">+ New key</button>} />
    );

    expect(screen.getByRole('button', { name: '+ New key' })).toBeInTheDocument();
  });

  it('carries the empty-state layout class', () => {
    const { container } = render(<EmptyState headline="Nothing here" />);

    expect(container.firstElementChild).toHaveClass('empty-state');
  });
});
