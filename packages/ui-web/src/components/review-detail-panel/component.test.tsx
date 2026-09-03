import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewDetailPanel } from './component';

function renderPanel(overrides: Partial<React.ComponentProps<typeof ReviewDetailPanel>> = {}) {
  const onDecide = vi.fn();
  const onNoteChange = vi.fn();

  render(
    <ReviewDetailPanel
      requester={{ kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' }}
      projectLabel="gateway-prod"
      accountLabel="adorsys-gis"
      submittedAt="3 days ago"
      requestedAmount={250}
      requesterNote="Q1 catalogue re-index lands this week."
      note=""
      onNoteChange={onNoteChange}
      onDecide={onDecide}
      {...overrides}
    />
  );

  return { onDecide, onNoteChange };
}

describe('ReviewDetailPanel', () => {
  it('renders the requested amount as the visual anchor', () => {
    renderPanel({ requestedAmount: 1131.8 });
    expect(screen.getByText('+$1 131.80')).toBeInTheDocument();
  });

  it('renders the project, account and submitted-at facts as a definition list, no raw ids', () => {
    renderPanel();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('carries no Consumption meter or History table — both were permanently unavailable upstream', () => {
    renderPanel();
    expect(screen.queryByText('Consumption')).not.toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('names the requested amount on the Approve button', () => {
    renderPanel({ requestedAmount: 250 });
    expect(screen.getByRole('button', { name: 'Approve +$250.00' })).toBeInTheDocument();
  });

  it('renders the requester note as prose, labelled as from the requester', () => {
    renderPanel();
    expect(screen.getByText('Note from requester')).toBeInTheDocument();
    expect(screen.getByText('Q1 catalogue re-index lands this week.')).toBeInTheDocument();
  });

  it('renders the reviewer note as its own section, never attributed to the requester', () => {
    renderPanel({
      requesterNote: undefined,
      reviewerNote: "Requested amount exceeds this quarter's growth allowance.",
    });
    expect(screen.getByText('Reviewer note')).toBeInTheDocument();
    expect(
      screen.getByText("Requested amount exceeds this quarter's growth allowance.")
    ).toBeInTheDocument();
    expect(screen.queryByText('Note from requester')).not.toBeInTheDocument();
  });

  it('omits both note sections when neither is supplied', () => {
    renderPanel({ requesterNote: undefined, reviewerNote: undefined });
    expect(screen.queryByText('Note from requester')).not.toBeInTheDocument();
    expect(screen.queryByText('Reviewer note')).not.toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText('Decision note'), {
      target: { value: 'Approved for Q1.' },
    });

    expect(onNoteChange).toHaveBeenCalledWith('Approved for Q1.');
  });

  it('disables both decision buttons while deciding', () => {
    renderPanel({ deciding: true });

    expect(screen.getByRole('button', { name: 'Approve +$250.00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });

  it('labels the decision note honestly — required to decline, not recorded on approve', () => {
    renderPanel();
    expect(
      screen.getByPlaceholderText('Required to decline · not recorded on approve')
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Optional · visible to requester')
    ).not.toBeInTheDocument();
  });

  // converse-frontends#322: `RejectAugmentationRequestInput.reason` is non-optional server-side
  // (authz.cstack:1146-1151) — an empty Decline must be blocked before it ever reaches the RPC
  // layer, not discovered via a round trip to the backend.
  it('blocks Decline client-side with an empty note and never calls onDecide', () => {
    const { onDecide } = renderPanel({ note: '' });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByText('A note is required to decline this request.')).toBeInTheDocument();
  });

  it('blocks Decline client-side with a whitespace-only note — not just an absent field', () => {
    const { onDecide } = renderPanel({ note: '   ' });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByText('A note is required to decline this request.')).toBeInTheDocument();
  });

  it('does not block Approve when the note is empty — Approve never required one', () => {
    const { onDecide } = renderPanel({ note: '' });

    fireEvent.click(screen.getByRole('button', { name: 'Approve +$250.00' }));

    expect(onDecide).toHaveBeenCalledWith('approve', '');
    expect(
      screen.queryByText('A note is required to decline this request.')
    ).not.toBeInTheDocument();
  });

  it('clears the note-required error once the reviewer starts typing', () => {
    const { onDecide, onNoteChange } = renderPanel({ note: '' });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.getByText('A note is required to decline this request.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Decision note'), {
      target: { value: 'N' },
    });

    expect(onNoteChange).toHaveBeenCalledWith('N');
    expect(
      screen.queryByText('A note is required to decline this request.')
    ).not.toBeInTheDocument();
    expect(onDecide).not.toHaveBeenCalled();
  });

  it('proceeds normally when Decline is submitted with a real note', () => {
    const { onDecide } = renderPanel({ note: 'Not this cycle.' });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecide).toHaveBeenCalledWith('decline', 'Not this cycle.');
    expect(
      screen.queryByText('A note is required to decline this request.')
    ).not.toBeInTheDocument();
  });
});
