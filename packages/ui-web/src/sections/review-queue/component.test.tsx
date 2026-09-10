import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewQueue } from './component';
import { pendingRequestsFixture } from './fixtures';
import type { ReviewQueueProps } from './types';

function makeProps(overrides: Partial<ReviewQueueProps> = {}): ReviewQueueProps {
  return {
    pending: pendingRequestsFixture,
    onSelectRequest: vi.fn(),
    ...overrides,
  };
}

describe('ReviewQueue', () => {
  it('renders Submitted, Project, Account, Requester and Refill — no Consumed/Ceiling', () => {
    render(<ReviewQueue {...makeProps()} />);

    for (const header of ['Submitted', 'Project', 'Account', 'Requester', 'Refill']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument();
    }
    // Both remain permanently `null` upstream — a column that can never hold a real value is not
    // a column. Requester is NOT in this list any more (converse-frontends#444): it is backed by
    // `AugmentationRequest.requestedByUserId` now, not by a copy of the Account cell.
    for (const gone of ['Consumed', 'Ceiling']) {
      expect(screen.queryByRole('columnheader', { name: gone })).not.toBeInTheDocument();
    }
  });

  // converse-frontends#444 — the Requester column's four branches. Every one of them RENDERS:
  // a labelled sentinel is never a reason to drop a row from a decision queue.
  describe('Requester column', () => {
    it('shows a resolved identity as name over email', () => {
      render(<ReviewQueue {...makeProps()} />);

      expect(screen.getByText('Maria Okonkwo')).toBeInTheDocument();
      expect(screen.getByText('maria@brightline.dev')).toBeInTheDocument();
    });

    it('shows the dated sentinel for a pre-migration row, and still lists the row', () => {
      render(<ReviewQueue {...makeProps()} />);

      expect(screen.getByText('Unknown (pre-2026-09)')).toBeInTheDocument();
      expect(screen.getByText('support-copilot')).toBeInTheDocument();
    });

    it('shows a distinct sentinel plus the raw id for an id the batch did not resolve', () => {
      render(<ReviewQueue {...makeProps()} />);

      expect(screen.getByText('Unresolved user')).toBeInTheDocument();
      expect(screen.getByText('usr_k3m9x1qp0z7v')).toBeInTheDocument();
    });

    it('says "resolving" while the batch is in flight rather than claiming "unknown"', () => {
      render(
        <ReviewQueue
          {...makeProps({
            pending: [{ ...pendingRequestsFixture[0]!, requester: { kind: 'resolving' } }],
          })}
        />
      );

      expect(screen.getByText('Resolving…')).toBeInTheDocument();
      expect(screen.queryByText('Unknown (pre-2026-09)')).not.toBeInTheDocument();
    });

    it('degrades to an InlineStatus above a fully rendered table, never a blocking error', () => {
      render(
        <ReviewQueue
          {...makeProps({
            pending: pendingRequestsFixture.map((row) => ({
              ...row,
              requester: { kind: 'unresolved' as const, userId: 'usr_k3m9x1qp0z7v' },
            })),
            requesterStatus: 'Requester names could not be resolved.',
          })}
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent(
        'Requester names could not be resolved.'
      );
      // The rows are still there and still decidable — the queue did not fail, a lookup did.
      // `role="grid"`, not `table`: `LedgerTable` promotes itself whenever rows are selectable,
      // which they are here (`onSelectRequest` is always wired on this queue).
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getAllByText('Unresolved user')).toHaveLength(pendingRequestsFixture.length);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders no status line at all when resolution is fine', () => {
      render(<ReviewQueue {...makeProps()} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('renders the resolved account label, never a raw id, in the Account column', () => {
    render(<ReviewQueue {...makeProps()} />);

    expect(screen.getAllByText('adorsys-gis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('adorsys-labs').length).toBeGreaterThan(0);
  });

  it('carries no Pending/Decided tabs any more', () => {
    render(<ReviewQueue {...makeProps()} />);

    expect(screen.queryByRole('button', { name: /Pending/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Decided/ })).not.toBeInTheDocument();
  });

  it('renders Submitted as a sortable header and fires onSortChange', () => {
    const onSortChange = vi.fn();
    render(<ReviewQueue {...makeProps({ onSortChange })} />);

    fireEvent.click(screen.getByRole('button', { name: /Submitted/ }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'submitted', direction: 'asc' });
  });

  it('fires onSelectRequest when a queue row is activated', () => {
    const onSelectRequest = vi.fn();
    render(<ReviewQueue {...makeProps({ onSelectRequest })} />);

    fireEvent.click(screen.getByText('gateway-prod'));

    expect(onSelectRequest).toHaveBeenCalledWith(pendingRequestsFixture[0]);
  });

  it('replaces the table with an honest empty state when nothing is pending', () => {
    render(<ReviewQueue {...makeProps({ pending: [] })} />);

    expect(screen.getByText('No requests awaiting a decision')).toBeInTheDocument();
    expect(
      screen.getByText('Refill requests submitted by project members appear here.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(
      <ReviewQueue
        {...makeProps({ pending: [], error: 'Could not load the refill queue.', onRetry })}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the refill queue.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('never renders a pagination row with nothing wired — no dead "more exist" caption', () => {
    render(<ReviewQueue {...makeProps()} />);

    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
  });

  it('renders pagination when the container wires a further page', () => {
    const onNext = vi.fn();
    render(
      <ReviewQueue
        {...makeProps({ pagination: { shown: 4, hasPrev: false, hasNext: true, onNext } })}
      />
    );

    const next = screen.getByRole('button', { name: /Next/ });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
