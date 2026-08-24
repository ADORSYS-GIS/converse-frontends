import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewDetailPanel } from './component';
import type { ReviewHistoryRow } from './types';

const history: ReviewHistoryRow[] = [
  { id: '1', label: '2 previous refills', amount: 350, meta: 'last 2026-02-08 · approved by sam' },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof ReviewDetailPanel>> = {}) {
  const onDecide = vi.fn();
  const onNoteChange = vi.fn();

  render(
    <ReviewDetailPanel
      subject="gateway-prod"
      requesterEmail="ada@adorsys.com"
      submittedAt="3 days ago"
      consumedAmount={455.2}
      ceilingAmount={500}
      requestedAmount={250}
      requesterNote="Q1 catalogue re-index lands this week."
      history={history}
      note=""
      onNoteChange={onNoteChange}
      onDecide={onDecide}
      {...overrides}
    />,
  );

  return { onDecide, onNoteChange };
}

describe('ReviewDetailPanel', () => {
  it('renders the subject and requester line', () => {
    renderPanel();
    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('ada@adorsys.com · 3 days ago')).toBeInTheDocument();
  });

  it('formats the consumption line with thin-space thousands and two decimals', () => {
    renderPanel({ consumedAmount: 1131.8, ceilingAmount: 2250 });
    expect(screen.getByText('$1 131.80')).toBeInTheDocument();
    expect(screen.getByText('of $2 250.00')).toBeInTheDocument();
  });

  it('names the requested amount on the Approve button', () => {
    renderPanel({ requestedAmount: 250 });
    expect(screen.getByRole('button', { name: 'Approve +$250.00' })).toBeInTheDocument();
  });

  it('renders the requester note as prose', () => {
    renderPanel();
    expect(screen.getByText('Q1 catalogue re-index lands this week.')).toBeInTheDocument();
  });

  it('renders history rows', () => {
    renderPanel();
    expect(screen.getByText('2 previous refills')).toBeInTheDocument();
    expect(screen.getByText('+$350.00')).toBeInTheDocument();
    expect(screen.getByText('last 2026-02-08 · approved by sam')).toBeInTheDocument();
  });

  it('fires onDecide("approve", note) with the current decision note', () => {
    const { onDecide } = renderPanel({ note: 'Looks good.' });

    fireEvent.click(screen.getByRole('button', { name: 'Approve +$250.00' }));

    expect(onDecide).toHaveBeenCalledWith('approve', 'Looks good.');
  });

  it('fires onDecide("decline", note) with the current decision note', () => {
    const { onDecide } = renderPanel({ note: 'Not this cycle.' });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecide).toHaveBeenCalledWith('decline', 'Not this cycle.');
  });

  it('propagates decision note edits via onNoteChange', () => {
    const { onNoteChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Decision note'), { target: { value: 'Approved for Q1.' } });

    expect(onNoteChange).toHaveBeenCalledWith('Approved for Q1.');
  });

  it('disables both decision buttons while deciding', () => {
    renderPanel({ deciding: true });

    expect(screen.getByRole('button', { name: 'Approve +$250.00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });
});
