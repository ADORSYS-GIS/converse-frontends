import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SegmentedControl } from './component';
import type { SegmentedOption } from './types';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Forms & actions/SegmentedControl',
  component: SegmentedControl,
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

const statusOptions: SegmentedOption<'all' | 'active' | 'revoked'>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

const formatOptions: SegmentedOption<'csv' | 'pdf'>[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
];

export const Default: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<'all' | 'active' | 'revoked'>('active');
      return (
        <div className="w-[248px]">
          <SegmentedControl
            aria-label="Status filter"
            options={statusOptions}
            value={value}
            onChange={setValue}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const TwoOptions: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<'csv' | 'pdf'>('csv');
      return (
        <div className="w-[248px]">
          <SegmentedControl
            aria-label="Export format"
            options={formatOptions}
            value={value}
            onChange={setValue}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const FirstOptionActive: Story = {
  render: () => (
    <div className="w-[248px]">
      <SegmentedControl
        aria-label="Status filter"
        options={statusOptions}
        value="all"
        onChange={() => {}}
      />
    </div>
  ),
};
