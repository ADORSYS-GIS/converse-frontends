import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewQueue } from './component';
import { pendingRequestsFixture } from './fixtures';
import type { ReviewQueueProps } from './types';

function makeProps(overrides: Partial<ReviewQueueProps> = {}): ReviewQueueProps {
  return {
    activeTab: 'pending',
    onTabChange: vi.fn(),
    pendingCount: pendingRequestsFixture.length,
    decidedCount: 26,
    pending: pendingRequestsFixture,
    onSelectRequest: vi.fn(),
    ...overrides,
  };
}

describe('ReviewQueue', () => {
  it('puts counts in the tab labels, never in a badge', () => {
    render(<ReviewQueue {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'Pending (4)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decided (26)' })).toBeInTheDocument();
  });

  it('fires onTabChange when the other tab is activated', () => {
    const onTabChange = vi.fn();
    render(<ReviewQueue {...makeProps({ onTabChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decided (26)' }));

    expect(onTabChange).toHaveBeenCalledWith('decided');
  });

  it('fires onSelectRequest when a queue row is activated', () => {
    const onSelectRequest = vi.fn();
    render(<ReviewQueue {...makeProps({ onSelectRequest })} />);

    fireEvent.click(screen.getByText('gateway-prod'));

    expect(onSelectRequest).toHaveBeenCalledWith(pendingRequestsFixture[0]);
  });

  it('shows the inline empty status and drops the expiry note when nothing is pending', () => {
    render(<ReviewQueue {...makeProps({ pending: [], pendingCount: 0 })} />);

    expect(
      screen.getByText('Nothing awaiting a decision. 26 decided requests shown below.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Requests expire after 14 days/)).not.toBeInTheDocument();
  });

  it('renders an honest dash instead of a fabricated $0.00 when consumption is unavailable', () => {
    render(
      <ReviewQueue
        {...makeProps({
          pending: [
            {
              id: 'req-unmeasured',
              submittedAgo: '1 h ago',
              project: 'new-service',
              account: 'adorsys-gis',
              consumed: null,
              ceiling: null,
              requestedAmount: 100,
              requesterEmail: 'ada@adorsys.com',
            },
          ],
          pendingCount: 1,
        })}
      />
    );

    const dashes = screen.getAllByText('—');
    // One dash in the CONSUMED cell, one in CEILING — never a fabricated $0.00.
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
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
});
