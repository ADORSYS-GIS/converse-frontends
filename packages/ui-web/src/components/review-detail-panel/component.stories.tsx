import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
    <div className="flex h-[820px] w-[280px] flex-col bg-surface p-4">
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

export const UnderThreshold: Story = {
  render: () => (
    <div className="flex h-[820px] w-[280px] flex-col bg-surface p-4">
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
    <div className="flex h-[820px] w-[280px] flex-col bg-surface p-4">
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
