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
  it('renders Submitted, Project, Account and Refill — no Consumed/Ceiling/Requester', () => {
    render(<ReviewQueue {...makeProps()} />);

    for (const header of ['Submitted', 'Project', 'Account', 'Refill']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(header) })).toBeInTheDocument();
    }
    for (const gone of ['Consumed', 'Ceiling', 'Requester']) {
      expect(screen.queryByRole('columnheader', { name: gone })).not.toBeInTheDocument();
    }
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
    render(<ReviewQueue {...makeProps({ pending: [], error: 'Could not load the refill queue.', onRetry })} />);

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
