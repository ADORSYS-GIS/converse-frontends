import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../components/stack';
import { Form } from './form';
import { FormField } from './form-field';
import { FormSubmit } from './form-submit';

const meta: Meta<typeof FormSubmit> = {
  title: 'Forms/FormSubmit',
  component: FormSubmit,
  args: {
    children: 'Create key',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Form defaultValues={{ keyName: '' }} onSubmit={() => undefined}>
          <Stack gap="md">
            <FormField name="keyName" label="Key name" placeholder="my-production-key" />
            <Story />
          </Stack>
        </Form>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormSubmit>;

export const Basic: Story = {};

export const Neutral: Story = {
  args: { variant: 'neutral' },
};
