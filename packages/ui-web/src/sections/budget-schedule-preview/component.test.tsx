import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetSchedulePreview, PREVIEW_ENTRY_LIMIT } from './component';
import { budgetSchedulePreviewEntries } from './fixtures';

const BASE = {
  status: 'ready' as const,
  dryRun: true,
  entries: budgetSchedulePreviewEntries,
  totalEntryCount: budgetSchedulePreviewEntries.length,
  entryLimit: PREVIEW_ENTRY_LIMIT,
  deferredCount: 0,
  supersededCount: 0,
};

describe('BudgetSchedulePreview', () => {
  // The acceptance criterion is explicit: "the preview explicitly states it wrote nothing".
  it('states that a dry run wrote nothing at all', () => {
    render(<BudgetSchedulePreview {...BASE} />);
    expect(screen.getByText(/Dry run — nothing was written/)).toBeInTheDocument();
    expect(
      screen.getByText(/no grant, no next-run advance, no last-run stamp/)
    ).toBeInTheDocument();
  });

  it('says the opposite, in the same place, for a real run', () => {
    render(<BudgetSchedulePreview {...BASE} dryRun={false} />);
    expect(screen.queryByText(/nothing was written/)).toBeNull();
    expect(screen.getByText(/Written to the ledger/)).toBeInTheDocument();
  });

  it('lists each affected account with its remaining and its signed change', () => {
    render(<BudgetSchedulePreview {...BASE} />);
    expect(screen.getByText('northwind-ai')).toBeInTheDocument();
    // A grant is signed `+`, a clamp-down keeps the `-` the money ladder already gives it — the
    // two never differ only by a character that is easy to miss.
    expect(screen.getByText('+$1.58')).toBeInTheDocument();
    expect(screen.getByText('-$10.40')).toBeInTheDocument();
  });

  it('shows a negative remaining as negative, never clamped to $0.00', () => {
    render(<BudgetSchedulePreview {...BASE} />);
    expect(screen.getByText('-$3.20')).toBeInTheDocument();
  });

  it('falls back to the id for an account nothing resolved', () => {
    render(<BudgetSchedulePreview {...BASE} />);
    expect(screen.getByText('acct_unresolved_9f2')).toBeInTheDocument();
  });

  it('states the exact total when nothing was truncated', () => {
    render(<BudgetSchedulePreview {...BASE} />);
    expect(screen.getByText(/8 affected accounts\./)).toBeInTheDocument();
  });

  // "the first 25 of 137" and "all 19" are completely different things for an operator about to
  // press Run now.
  it('states the cap and the real total when the cap dropped rows', () => {
    render(<BudgetSchedulePreview {...BASE} totalEntryCount={137} />);
    expect(screen.getByText(/Showing the first 25 of 137 affected accounts\./)).toBeInTheDocument();
  });

  it('reports deferred and superseded accounts rather than dropping them silently', () => {
    render(<BudgetSchedulePreview {...BASE} deferredCount={3} supersededCount={11} />);
    expect(screen.getByText(/3 deferred/)).toBeInTheDocument();
    expect(screen.getByText(/spend was unreadable/)).toBeInTheDocument();
    expect(screen.getByText(/11 superseded by a more specific schedule/)).toBeInTheDocument();
  });

  it('explains an empty plan rather than showing an empty table', () => {
    render(<BudgetSchedulePreview {...BASE} entries={[]} totalEntryCount={0} />);
    expect(screen.getByText(/No account would change/)).toBeInTheDocument();
    expect(screen.getByText(/already exactly on target/)).toBeInTheDocument();
  });

  it('renders a retryable error, not an empty plan, when the run failed', () => {
    render(
      <BudgetSchedulePreview
        {...BASE}
        status="error"
        entries={[]}
        totalEntryCount={0}
        errorMessage="Forbidden"
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.queryByText(/No account would change/)).toBeNull();
  });

  it('says what a preview is before one has been run', () => {
    render(<BudgetSchedulePreview {...BASE} status="idle" entries={[]} totalEntryCount={0} />);
    expect(screen.getByText(/Preview a schedule to see the exact ledger rows/)).toBeInTheDocument();
  });
});
