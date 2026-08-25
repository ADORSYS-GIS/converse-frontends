import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ReviewDetailPanelProps } from '../../components/review-detail-panel';
import { ReviewDetailRail } from './component';
import { gatewayProdHistory } from './fixtures';

function makeDetail(overrides: Partial<ReviewDetailPanelProps> = {}): ReviewDetailPanelProps {
  return {
    subject: 'gateway-prod',
    requesterEmail: 'ada@adorsys.com',
    submittedAt: '2026-02-19',
    consumedAmount: 455.2,
    ceilingAmount: 500,
    requestedAmount: 250,
    history: gatewayProdHistory,
    note: '',
    onNoteChange: vi.fn(),
    onDecide: vi.fn(),
    ...overrides,
  };
}

describe('ReviewDetailRail', () => {
  it('falls back to an inline status line when nothing is selected', () => {
    render(<ReviewDetailRail detail={null} />);

    expect(screen.getByText('Select a request to review it.')).toBeInTheDocument();
  });

  it('renders the panel for the selected request', () => {
    render(<ReviewDetailRail detail={makeDetail()} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
  });

  it('wires the decision actions straight through to onDecide', () => {
    const onDecide = vi.fn();
    render(<ReviewDetailRail detail={makeDetail({ onDecide })} />);

    fireEvent.click(screen.getByRole('button', { name: /^Approve/ }));

    expect(onDecide).toHaveBeenCalledWith('approve', '');
  });
});
