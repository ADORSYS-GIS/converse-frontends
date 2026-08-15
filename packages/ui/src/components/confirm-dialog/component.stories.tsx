import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { TextField } from '../text-field';
import { ConfirmDialog } from './component';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    title: 'Revoke this key?',
    message: 'Any requests made with this key will start failing immediately.',
    confirmLabel: 'Revoke',
    cancelLabel: 'Cancel',
    onCancel: () => undefined,
    onConfirm: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

/** Named component (not an inline arrow) so the `useState` below is a real
 * React component's hook, not a Storybook `render` closure — Storybook's
 * `render` functions aren't components by React's rules, so hooks called
 * directly inside one trip `react-hooks/rules-of-hooks`. */
function TypedConfirmationDemo(args: React.ComponentProps<typeof ConfirmDialog>) {
  const target = 'my-account';
  const [value, setValue] = useState('');
  return (
    <ConfirmDialog {...args} confirmDisabled={value.trim() !== target}>
      <Text intent="caption">
        Type <Text intent="bodyStrong">{target}</Text> to confirm.
      </Text>
      <TextField
        value={value}
        onChangeText={setValue}
        placeholder={target}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </ConfirmDialog>
  );
}

export const Neutral: Story = {};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Delete this project?',
    message: 'This permanently deletes the project and everything in it. This cannot be undone.',
    confirmLabel: 'Delete project',
  },
};

export const Loading: Story = {
  args: {
    tone: 'danger',
    title: 'Delete this project?',
    message: 'This permanently deletes the project and everything in it. This cannot be undone.',
    confirmLabel: 'Deleting…',
    loading: true,
  },
};

/**
 * Typed-confirmation gate for the most destructive actions (account/project
 * deletion): the caller owns the input + matching logic and drives
 * `confirmDisabled`, mirroring the app's existing delete-account/
 * delete-project views.
 */
export const TypedConfirmation: Story = {
  args: {
    tone: 'danger',
    title: 'Delete this account?',
    message: 'This permanently deletes your account and all of its data.',
    confirmLabel: 'Delete account',
  },
  render: (args) => <TypedConfirmationDemo {...args} />,
};
