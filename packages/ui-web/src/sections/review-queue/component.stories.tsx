import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import type { LedgerSort } from '../../components/ledger-table';
import { ReviewQueue } from './component';
import { pendingRequestsFixture } from './fixtures';
import type { RefillRequestRow } from './types';

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
  withPagination = false,
}: {
  pending?: RefillRequestRow[];
  loading?: boolean;
  error?: string;
  initialSelectedId?: string | null;
  withPagination?: boolean;
}) {
  const [sort, setSort] = useState<LedgerSort>({ key: 'submitted', direction: 'asc' });
  const [selected, setSelected] = useState<string | null>(initialSelectedId);

  return (
    <div className="p-6">
      <Card>
        <ReviewQueue
          pending={pending}
          loading={loading}
          error={error}
          onRetry={() => {}}
          sort={sort}
          onSortChange={setSort}
          selectedRequestId={selected}
          onSelectRequest={(row) => setSelected(row.id)}
          pagination={
            withPagination
              ? { shown: pending.length, hasPrev: false, hasNext: true, onNext: () => {} }
              : undefined
          }
        />
      </Card>
    </div>
  );
}

export const Populated: Story = { render: () => <Demo initialSelectedId="gateway-prod" /> };

export const WithPagination: Story = {
  render: () => <Demo initialSelectedId="gateway-prod" withPagination />,
};

export const Empty: Story = { render: () => <Demo pending={[]} /> };

export const Loading: Story = { render: () => <Demo pending={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo pending={[]} error="Could not load the refill queue." />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
