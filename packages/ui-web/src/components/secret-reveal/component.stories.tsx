import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { SecretReveal } from './component';

const meta: Meta<typeof SecretReveal> = {
  title: 'Primitives/Actions/SecretReveal',
  component: SecretReveal,
  args: {
    heading: 'New key created — shown once',
    description:
      'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.',
    secret: 'sk-lb-Xq7T4mA9vR2nK8sE1wYb6tZ0pL5cJ3dF',
    onDismiss: fn(),
  },
  render: (args) => (
    <div className="bg-muted w-[872px] p-4">
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
    // `defineProperty`, not `Object.assign`: in a real browser `navigator.clipboard` is an
    // accessor with no setter, and assigning to it throws `Cannot set property clipboard of
    // #<Navigator> which has only a getter`. jsdom happens to allow the assignment, which is why
    // this only surfaced under the browser-mode a11y run (`vitest.storybook.config.mts`).
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: fn().mockResolvedValue(undefined) },
    });
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
