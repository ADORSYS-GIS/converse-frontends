import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EstateBudgetPressure } from './component';
import { estateBudgetPressureAccounts } from './fixtures';

describe('EstateBudgetPressure', () => {
  it('ranks accounts by their OWN consumption ratio, not raw spend', () => {
    render(<EstateBudgetPressure accounts={estateBudgetPressureAccounts} />);

    // `stark-infer` (92% of $200) and `northwind-ai` (91% of $500) both outrank `acme-labs`
    // ($4,218.62 of $5,000 — 84%), which outspends either of them many times over.
    const names = screen
      .getAllByText(/^(stark-infer|northwind-ai|acme-labs)$/)
      .map((node) => node.textContent);
    expect(names.indexOf('stark-infer')).toBeLessThan(names.indexOf('acme-labs'));
    expect(names.indexOf('northwind-ai')).toBeLessThan(names.indexOf('acme-labs'));
  });

  it('measures every row against its own ceiling', () => {
    render(<EstateBudgetPressure accounts={estateBudgetPressureAccounts} />);

    expect(screen.getByText('$456.20 of $500.00')).toBeInTheDocument();
    expect(screen.getByText('$183.40 of $200.00')).toBeInTheDocument();
  });

  it('renders a meter for every row, unlike the single-ceiling sister section', () => {
    render(<EstateBudgetPressure accounts={estateBudgetPressureAccounts} />);

    expect(screen.getAllByRole('meter')).toHaveLength(estateBudgetPressureAccounts.length);
  });

  it('keeps the heading rendered over an inline status line when nothing drew', () => {
    render(<EstateBudgetPressure accounts={[]} label="Budget pressure" />);

    expect(screen.getByText('Budget pressure')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No account drew on its ceiling this period.'
    );
  });

  it('replaces the rows with a retryable signal line on error, not with zeros', () => {
    const onRetry = () => {};
    render(
      <EstateBudgetPressure
        accounts={estateBudgetPressureAccounts}
        status="error"
        errorMessage="The usage backend is unreachable right now."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The usage backend is unreachable right now.'
    );
    expect(screen.queryByText('acme-labs')).not.toBeInTheDocument();
  });
});
