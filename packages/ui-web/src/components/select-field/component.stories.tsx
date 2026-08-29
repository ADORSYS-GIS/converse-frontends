import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SelectField } from './component';

const meta: Meta<typeof SelectField> = {
  title: 'Forms/SelectField',
  component: SelectField,
};

export default meta;
type Story = StoryObj<typeof SelectField>;

function Demo() {
  const [value, setValue] = useState('last-30');
  return (
    <div className="w-[248px] bg-surface p-4">
      <SelectField
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
