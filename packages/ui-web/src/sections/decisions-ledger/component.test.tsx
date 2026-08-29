import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DecisionsLedger } from './component';
import { recentDecisionsFixture } from './fixtures';

describe('DecisionsLedger', () => {
  it('renders its heading and the decision rows', () => {
    render(<DecisionsLedger decisions={recentDecisionsFixture} />);

    expect(screen.getByText('Recent decisions')).toBeInTheDocument();
    expect(screen.getByText('rag-catalogue')).toBeInTheDocument();
  });

  it('states the outcome as plain text in a grey step, never a pill or a colour', () => {
    render(<DecisionsLedger decisions={recentDecisionsFixture} />);

    expect(screen.getAllByText('approved')[0]).toHaveClass('text-soft');
    expect(screen.getAllByText('declined')[0]).toHaveClass('text-subtle');
  });

  it('renders its own pager when one is supplied', () => {
    const onNext = vi.fn();
    render(
      <DecisionsLedger
        decisions={recentDecisionsFixture}
        pagination={{ shown: 6, total: 26, hasPrev: false, hasNext: true, onNext }}
      />
    );

    expect(screen.getByText('6 of 26 decisions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'next ›' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('keeps the header row rendered when there are no decisions yet', () => {
    render(<DecisionsLedger decisions={[]} />);

    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
  });

  it('renders auto-approved distinctly from a human approval, in the same grey step', () => {
    render(
      <DecisionsLedger
        decisions={[
          {
            id: 'd7',
            date: '2026-02-20',
            project: 'p',
            account: 'a',
            amount: 10,
            decision: 'auto_approved',
            decidedBy: '—',
          },
        ]}
      />
    );

    expect(screen.getByText('auto-approved')).toHaveClass('text-soft');
  });

  it('renders the backend\'s raw status verbatim for an unrecognised status, never "declined"', () => {
    render(
      <DecisionsLedger
        decisions={[
          {
            id: 'd8',
            date: '2026-02-20',
            project: 'p',
            account: 'a',
            amount: 10,
            decision: 'unknown',
            rawStatus: 'archived',
            decidedBy: 'sam',
          },
        ]}
      />
    );

    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(screen.queryByText('declined')).not.toBeInTheDocument();
  });

  it('never fabricates a total — shows only what is actually rendered when the total is unknown', () => {
    render(<DecisionsLedger decisions={recentDecisionsFixture} pagination={{ shown: 6 }} />);

    expect(screen.getByText('6 decisions shown')).toBeInTheDocument();
    expect(screen.queryByText(/of \d+ decisions/)).not.toBeInTheDocument();
  });

  it('states more may exist instead of claiming hasNext: false as a verified fact', () => {
    render(
      <DecisionsLedger
        decisions={recentDecisionsFixture}
        pagination={{ shown: 6, hasNext: true }}
      />
    );

    expect(screen.getByText('6 decisions shown · more exist')).toBeInTheDocument();
  });

  it('hides the prev/next controls when pagination is not actually wired up', () => {
    render(<DecisionsLedger decisions={recentDecisionsFixture} pagination={{ shown: 6 }} />);

    expect(screen.queryByRole('button', { name: 'next ›' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '‹ prev' })).not.toBeInTheDocument();
  });

  it('renders a source caveat above the ledger when the data source has a known limitation', () => {
    render(
      <DecisionsLedger
        decisions={recentDecisionsFixture}
        sourceCaveat="No dedicated decided-request endpoint exists yet."
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'No dedicated decided-request endpoint exists yet.'
    );
  });
});
