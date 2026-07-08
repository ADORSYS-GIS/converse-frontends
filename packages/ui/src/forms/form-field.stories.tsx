import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Form } from './form';
import { FormField } from './form-field';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  args: {
    name: 'keyName',
    label: 'Key name',
    placeholder: 'my-production-key',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Form defaultValues={{ keyName: '' }} onSubmit={() => undefined}>
          <Story />
        </Form>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Basic: Story = {};

export const WithDescription: Story = {
  args: { description: 'A human-friendly label to recognize this key later.' },
};
