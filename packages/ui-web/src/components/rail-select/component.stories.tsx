import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailSelect } from './component';

const meta: Meta<typeof RailSelect> = {
  title: 'Forms/RailSelect',
  component: RailSelect,
};

export default meta;
type Story = StoryObj<typeof RailSelect>;

function Demo() {
  const [value, setValue] = useState('last-30');
  return (
    <div className="w-[248px] bg-surface p-4">
      <RailSelect
        label="Range"
        value={value}
        options={[
          { value: 'last-7', label: 'Last 7 days' },
          { value: 'last-30', label: 'Last 30 days' },
          { value: 'last-90', label: 'Last 90 days' },
        ]}
        onChange={setValue}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
