import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { ReviewDetailPanel } from './component';
import type { ReviewHistoryRow } from './types';

const meta: Meta<typeof ReviewDetailPanel> = {
  title: 'Forms & actions/ReviewDetailPanel',
  component: ReviewDetailPanel,
};

export default meta;
type Story = StoryObj<typeof ReviewDetailPanel>;

const history: ReviewHistoryRow[] = [
  { id: '1', label: '2 previous refills', amount: 350, meta: 'last 2026-02-08 · approved by sam' },
];

function Demo() {
  const [note, setNote] = useState('');
  return (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        subject="gateway-prod"
        requesterEmail="ada@adorsys.com"
        submittedAt="3 days ago"
        consumedAmount={455.2}
        ceilingAmount={500}
        requestedAmount={250}
        requesterNote="Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar."
        history={history}
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

// converse-frontends#265/#266: today's real `/admin` container has no consumption query, no
// requester-note field and no history query — this is the actual honest shape it renders, not a
// hypothetical edge case.
export const NoSupportingData: Story = {
  name: 'No supporting data (honest — matches the real /admin container today)',
  render: () => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        subject="gateway-prod"
        requesterEmail="ada@adorsys.com"
        submittedAt="3 days ago"
        requestedAmount={250}
        history={null}
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
        subject="gateway-prod"
        requesterEmail="ada@adorsys.com"
        submittedAt="3 days ago"
        requestedAmount={250}
        reviewerNote="Requested amount exceeds this quarter's growth allowance."
        history={null}
        note=""
        onNoteChange={() => {}}
        onDecide={() => {}}
      />
    </div>
  ),
};

export const UnderThreshold: Story = {
  render: () => (
    <div className="bg-surface flex h-[820px] w-[280px] flex-col p-4">
      <ReviewDetailPanel
        subject="agent-sandbox"
        requesterEmail="joel@adorsys.com"
        submittedAt="2 hours ago"
        consumedAmount={33.1}
        ceilingAmount={100}
        requestedAmount={500}
        history={[]}
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
        subject="batch-eval"
        requesterEmail="joel@adorsys.com"
        submittedAt="2 days ago"
        consumedAmount={231.44}
        ceilingAmount={250}
        requestedAmount={100}
        history={[]}
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
    subject: 'agent-sandbox',
    requesterEmail: 'joel@adorsys.com',
    submittedAt: '2 hours ago',
    requestedAmount: 500,
    history: [],
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
