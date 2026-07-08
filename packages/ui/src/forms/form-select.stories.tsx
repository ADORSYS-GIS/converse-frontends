import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Form } from './form';
import { FormSelect } from './form-select';

const meta: Meta<typeof FormSelect> = {
  title: 'Forms/FormSelect',
  component: FormSelect,
  args: {
    name: 'scope',
    label: 'Scope',
    placeholder: 'Select a scope',
    options: [
      { label: 'Read only', value: 'read' },
      { label: 'Read & write', value: 'read-write' },
      { label: 'Admin', value: 'admin' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Form defaultValues={{ scope: '' }} onSubmit={() => undefined}>
          <Story />
        </Form>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormSelect>;

export const Basic: Story = {};
