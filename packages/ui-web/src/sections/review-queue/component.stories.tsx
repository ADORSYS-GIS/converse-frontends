import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReviewQueue } from './component';
import { pendingRequestsFixture } from './fixtures';
import type { AdminReviewTab, RefillRequestRow } from './types';

const meta: Meta<typeof ReviewQueue> = {
  title: 'Sections/ReviewQueue',
  component: ReviewQueue,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ReviewQueue>;

function Demo({
  pending = pendingRequestsFixture,
  loading = false,
  error,
  initialSelectedId = null,
}: {
  pending?: RefillRequestRow[];
  loading?: boolean;
  error?: string;
  initialSelectedId?: string | null;
}) {
  const [tab, setTab] = useState<AdminReviewTab>('pending');
  const [selected, setSelected] = useState<string | null>(initialSelectedId);

  return (
    <div className="p-6">
      <ReviewQueue
        activeTab={tab}
        onTabChange={setTab}
        pendingCount={pending.length}
        decidedCount={26}
        pending={pending}
        loading={loading}
        error={error}
        onRetry={() => {}}
        selectedRequestId={selected}
        onSelectRequest={(row) => setSelected(row.id)}
      />
    </div>
  );
}

export const Populated: Story = { render: () => <Demo initialSelectedId="gateway-prod" /> };

export const Empty: Story = { render: () => <Demo pending={[]} /> };

export const Loading: Story = { render: () => <Demo pending={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo pending={[]} error="Could not load the refill queue." />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
