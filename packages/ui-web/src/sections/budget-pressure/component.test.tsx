import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetPressure } from './component';
import { ADMIN_BUDGET_PRESSURE_NOTE, ADMIN_CEILING, adminBudgetPressureProjects } from './fixtures';

describe('BudgetPressure', () => {
  it('ranks projects by draw, largest first, regardless of the order given', () => {
    render(
      <BudgetPressure
        projects={[...adminBudgetPressureProjects].reverse()}
        ceiling={ADMIN_CEILING}
      />
    );

    // Anchored: each `Meter`'s own `sr-only` label also carries the project name.
    const names = screen
      .getAllByText(/^(gateway-prod|ingest-batch|playground)$/)
      .map((node) => node.textContent);
    expect(names).toEqual(['gateway-prod', 'ingest-batch', 'playground']);
  });

  it('measures every row against the account ceiling, keeping sub-cent spend legible', () => {
    render(<BudgetPressure projects={adminBudgetPressureProjects} ceiling={ADMIN_CEILING} />);

    // `lib/money`'s precision ladder, not a clamped `$0.00` — the production case this exists for.
    expect(screen.getByText('$0.0063 of $12.00')).toBeInTheDocument();
    expect(screen.getByText('$10.94 of $12.00')).toBeInTheDocument();
  });

  it('renders no meter at all when there is no ceiling to measure against', () => {
    const { container } = render(
      <BudgetPressure projects={adminBudgetPressureProjects} ceiling={null} />
    );

    expect(container.querySelectorAll('[role="meter"]')).toHaveLength(0);
    // The spend itself is still real and still shown — only the comparison is withheld.
    expect(screen.getByText('$10.94')).toBeInTheDocument();
  });

  it('renders the scope caveat as DOM text, never inside an SVG', () => {
    const { container } = render(
      <BudgetPressure
        projects={adminBudgetPressureProjects}
        ceiling={ADMIN_CEILING}
        note={ADMIN_BUDGET_PRESSURE_NOTE}
      />
    );

    const note = screen.getByText(ADMIN_BUDGET_PRESSURE_NOTE);
    expect(note.tagName).toBe('P');
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('keeps the heading rendered over an inline status line when nothing drew', () => {
    render(<BudgetPressure projects={[]} ceiling={ADMIN_CEILING} label="Budget pressure" />);

    expect(screen.getByText('Budget pressure')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No project drew on the ceiling this period.'
    );
  });

  it('replaces the rows with a retryable signal line on error, not with zeros', () => {
    const onRetry = () => {};
    render(
      <BudgetPressure
        projects={adminBudgetPressureProjects}
        ceiling={ADMIN_CEILING}
        status="error"
        errorMessage="The usage backend is unreachable right now."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The usage backend is unreachable right now.'
    );
    expect(screen.queryByText('gateway-prod')).not.toBeInTheDocument();
  });
});
