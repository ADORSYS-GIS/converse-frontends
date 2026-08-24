import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Field } from './component';

const meta: Meta<typeof Field> = {
  title: 'Forms & actions/Field',
  component: Field,
  args: {
    label: 'Key name',
    placeholder: 'ci-deploy',
  },
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[280px]">
      <Field {...args} />
    </div>
  ),
};

export const Focused: Story = {
  render: (args) => (
    <div className="w-[280px]">
      {/* autoFocus demonstrates the focus → primary border treatment */}
      <Field {...args} autoFocus />
    </div>
  ),
};

export const WithError: Story = {
  render: (args) => (
    <div className="w-[280px]">
      <Field {...args} error="A key with this name already exists." defaultValue="ci-deploy" />
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="w-[280px]">
      <Field {...args} disabled defaultValue="gateway-prod" />
    </div>
  ),
};

export const Textarea: Story = {
  render: () => (
    <div className="w-[280px]">
      <Field label="Decision note" multiline placeholder="Optional · visible to requester" rows={3} />
    </div>
  ),
};

export const Uncontrolled: Story = {
  render: (args) => (
    <div className="w-[280px]">
      <Field {...args} defaultValue="uncontrolled-value" />
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    function ControlledField() {
      const [value, setValue] = useState('controlled-value');
      return (
        <Field
          label="Key name"
          placeholder="ci-deploy"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }
    return (
      <div className="w-[280px]">
        <ControlledField />
      </div>
    );
  },
};
