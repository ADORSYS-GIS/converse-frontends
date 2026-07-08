import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Form } from './form';
import { FormTextArea } from './form-text-area';

const meta: Meta<typeof FormTextArea> = {
  title: 'Forms/FormTextArea',
  component: FormTextArea,
  args: {
    name: 'notes',
    label: 'Notes',
    placeholder: 'What is this key used for?',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Form defaultValues={{ notes: '' }} onSubmit={() => undefined}>
          <Story />
        </Form>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormTextArea>;

export const Basic: Story = {};

export const WithDescription: Story = {
  args: { description: 'Visible to teammates with access to this project.' },
};
