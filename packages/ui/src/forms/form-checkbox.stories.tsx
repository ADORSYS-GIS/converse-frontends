import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Form } from './form';
import { FormCheckbox } from './form-checkbox';

const meta: Meta<typeof FormCheckbox> = {
  title: 'Forms/FormCheckbox',
  component: FormCheckbox,
  args: {
    name: 'acceptTerms',
    label: 'I accept the terms of service',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Form defaultValues={{ acceptTerms: false }} onSubmit={() => undefined}>
          <Story />
        </Form>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormCheckbox>;

export const Basic: Story = {};
