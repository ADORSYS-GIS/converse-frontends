import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import { MANAGE_FILTERS_RAIL_LABEL, ManageFiltersRail } from './component';
import { manageAccountOptions, manageBudgetStateOptions, manageStatusOptions } from './fixtures';

const meta: Meta<typeof ManageFiltersRail> = {
  title: 'Sections/ManageFiltersRail',
  component: ManageFiltersRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ManageFiltersRail>;

function Demo() {
  const [account, setAccount] = useState('all');
  const [status, setStatus] = useState('all');
  const [budgetState, setBudgetState] = useState('any');

  return (
    <div className="w-[280px] bg-surface">
      <Card title={MANAGE_FILTERS_RAIL_LABEL}>
        <ManageFiltersRail
          accountValue={account}
          accountOptions={manageAccountOptions}
          onAccountChange={setAccount}
          statusOptions={manageStatusOptions}
          statusValue={status}
          onStatusChange={setStatus}
          budgetStateValue={budgetState}
          budgetStateOptions={manageBudgetStateOptions}
          onBudgetStateChange={setBudgetState}
        />
      </Card>
    </div>
  );
}

export const InRail: Story = { render: () => <Demo /> };
