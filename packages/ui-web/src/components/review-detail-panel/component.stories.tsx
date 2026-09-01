import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { ReviewDetailPanel } from './component';

const meta: Meta<typeof ReviewDetailPanel> = {
  title: 'Forms & actions/ReviewDetailPanel',
  component: ReviewDetailPanel,
};

export default meta;
type Story = StoryObj<typeof ReviewDetailPanel>;

function Demo() {
  const [note, setNote] = useState('');
  return (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        projectLabel="gateway-prod"
        accountLabel="adorsys-gis"
        submittedAt="3 days ago"
        requestedAmount={250}
        requesterNote="Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar."
        note={note}
        onNoteChange={setNote}
        onDecide={() => {}}
      />
    </div>
  );
}

export const Populated: Story = {
  render: () => <Demo />,
};

// converse-frontends#265/#266: today's real `/admin` container has no requester-note field —
// this is the actual honest shape it renders, not a hypothetical edge case.
export const NoSupportingData: Story = {
  name: 'No supporting data (honest — matches the real /admin container today)',
  render: () => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        projectLabel="gateway-prod"
        accountLabel="adorsys-gis"
        submittedAt="3 days ago"
        requestedAmount={250}
        note=""
        onNoteChange={() => {}}
        onDecide={() => {}}
      />
    </div>
  ),
};

// A rejected-then-reopened request: the reviewer's own prior rationale, correctly attributed.
export const WithReviewerNote: Story = {
  render: () => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        projectLabel="gateway-prod"
        accountLabel="adorsys-gis"
        submittedAt="3 days ago"
        requestedAmount={250}
        reviewerNote="Requested amount exceeds this quarter's growth allowance."
        note=""
        onNoteChange={() => {}}
        onDecide={() => {}}
      />
    </div>
  ),
};

export const Deciding: Story = {
  render: () => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        projectLabel="batch-eval"
        accountLabel="adorsys-gis"
        submittedAt="2 days ago"
        requestedAmount={100}
        note="Approved for the sprint."
        onNoteChange={() => {}}
        onDecide={() => {}}
        deciding
      />
    </div>
  ),
};

// converse-frontends#322: `RejectAugmentationRequestInput.reason` is non-optional server-side
// (authz.cstack:1146-1151) — Decline with an empty note is blocked client-side, before any RPC
// call, with an inline `Field` error naming why. `onDecide` must never fire.
export const DeclineBlockedOnEmptyNote: Story = {
  name: 'Decline blocked — empty note (converse-frontends#322)',
  args: {
    projectLabel: 'agent-sandbox',
    accountLabel: 'adorsys-labs',
    submittedAt: '2 hours ago',
    requestedAmount: 500,
    note: '',
    onNoteChange: fn(),
    onDecide: fn(),
  },
  render: (args) => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel {...args} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Decline' }));
    await waitFor(() =>
      expect(canvas.getByText('A note is required to decline this request.')).toBeInTheDocument()
    );
    expect(args.onDecide).not.toHaveBeenCalled();
  },
};
