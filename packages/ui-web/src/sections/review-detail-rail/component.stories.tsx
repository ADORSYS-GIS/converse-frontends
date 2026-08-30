import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { REVIEW_DETAIL_RAIL_LABEL, ReviewDetailRail } from './component';
import { gatewayProdHistory } from './fixtures';

const meta: Meta<typeof ReviewDetailRail> = {
  title: 'Sections/ReviewDetailRail',
  component: ReviewDetailRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ReviewDetailRail>;

function Demo({ deciding = false }) {
  const [note, setNote] = useState('');
  return (
    <div className="w-[280px] bg-surface">
      <Card>
        <ReviewDetailRail
          detail={{
            subject: 'gateway-prod',
            requesterEmail: 'ada@adorsys.com',
            submittedAt: '3 d ago',
            consumedAmount: 455.2,
            ceilingAmount: 500,
            requestedAmount: 250,
            requesterNote: 'Traffic spike from the new onboarding flow; ceiling hit early.',
            history: gatewayProdHistory,
            note,
            onNoteChange: setNote,
            onDecide: () => {},
            deciding,
          }}
        />
      </Card>
    </div>
  );
}

export const RequestSelected: Story = { render: () => <Demo /> };

export const Deciding: Story = { render: () => <Demo deciding /> };

// Nothing selected — an inline status line, not a centered placard. The `Card` here carries
// no label at all, matching the mockup's unlabelled review panel.
export const NothingSelected: Story = {
  render: () => (
    <div className="w-[280px] bg-surface">
      <Card title={REVIEW_DETAIL_RAIL_LABEL}>
        <ReviewDetailRail detail={null} />
      </Card>
    </div>
  ),
};
