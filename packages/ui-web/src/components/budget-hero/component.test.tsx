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
      />
    );

    expect(screen.getByRole('button', { name: 'Request refill' })).toBeInTheDocument();
  });

  it('keeps the numeral ink-coloured regardless of breach state', () => {
    render(<BudgetHero value={498} ceiling={500} />);

    expect(screen.getByText('$498.00')).toHaveClass('text-ink');
  });

  // Regression for #273: an unknown consumption/ceiling must never render as a fabricated
  // "$0.00 of $0.00" — the dominant element must be an honest "unknown," at the number's own
  // visual weight, not a small caveat underneath a false figure.
  describe('status="unwired"', () => {
    it('shows "Not wired" as the dominant headline instead of a fabricated numeral', () => {
      render(
        <BudgetHero
          status="unwired"
          caption="Budget figures arrive with the budget query wiring."
        />
      );

      expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^of \$/)).not.toBeInTheDocument();
      const headline = screen.getByText('Not wired');
      expect(headline).toHaveClass('text-[26px]', 'text-ink');
    });

    it('renders no meter — an unknown ceiling has no percentage to show', () => {
      render(<BudgetHero status="unwired" />);

      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    });

    it('still renders the explanatory caption', () => {
      render(
        <BudgetHero
          status="unwired"
          caption="Budget figures arrive with the budget query wiring."
        />
      );

      expect(
        screen.getByText('Budget figures arrive with the budget query wiring.')
      ).toBeInTheDocument();
    });
  });
});
