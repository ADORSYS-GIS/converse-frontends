import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { SecretReveal } from './component';

const meta: Meta<typeof SecretReveal> = {
  title: 'Forms & actions/SecretReveal',
  component: SecretReveal,
  args: {
    heading: 'New key created — shown once',
    description: 'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.',
    secret: 'sk-lb-Xq7T4mA9vR2nK8sE1wYb6tZ0pL5cJ3dF',
    onDismiss: fn(),
  },
  render: (args) => (
    <div className="w-[872px] bg-muted p-4">
      <SecretReveal {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof SecretReveal>;

export const PreCopy: Story = {
  name: 'Before copy',
};

export const PostCopy: Story = {
  name: 'After copy (confirmation shown)',
  beforeEach: () => {
    Object.assign(navigator, { clipboard: { writeText: fn().mockResolvedValue(undefined) } });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
  },
};

export const Rotated: Story = {
  args: {
    heading: 'Key rotated — shown once',
    secret: 'sk-lb-9zC1qF5rN0mK8sE1wYb6tZ0pL5cJ3dA',
  },
};
