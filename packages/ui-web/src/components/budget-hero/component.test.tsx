import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetHero } from './component';

describe('BudgetHero', () => {
  it('renders the metric numeral and ceiling', () => {
    render(<BudgetHero value={142.55} ceiling={500} />);

    expect(screen.getByText('$142.55')).toBeInTheDocument();
    expect(screen.getByText('of $500.00')).toBeInTheDocument();
  });

  it('renders a meter under the numeral', () => {
    render(<BudgetHero value={142.55} ceiling={500} />);

    expect(screen.getByRole('meter')).toBeInTheDocument();
  });

  it('renders the caption when given', () => {
    render(<BudgetHero value={142.55} ceiling={500} caption="account ceiling · 28% used" />);

    expect(screen.getByText('account ceiling · 28% used')).toBeInTheDocument();
  });

  it('renders the inline action slot when given', () => {
    render(
      <BudgetHero
        value={455.2}
        ceiling={500}
        action={<button type="button">Request refill</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Request refill' })).toBeInTheDocument();
  });

  it('keeps the numeral ink-coloured regardless of breach state', () => {
    render(<BudgetHero value={498} ceiling={500} />);

    expect(screen.getByText('$498.00')).toHaveClass('text-ink');
  });
});
