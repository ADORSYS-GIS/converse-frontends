import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { TypedConfirmDialog } from './component';

const meta: Meta<typeof TypedConfirmDialog> = {
  title: 'Forms & actions/TypedConfirmDialog',
  component: TypedConfirmDialog,
  args: {
    open: true,
    title: 'Revoke ci-deploy?',
    description:
      'Revoking disables ci-deploy immediately and keeps its history. The old secret stops working immediately. This does not delete the key.',
    objectName: 'ci-deploy',
    confirmLabel: 'Revoke',
    onConfirm: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TypedConfirmDialog>;

export const Default: Story = {};

// Base UI portals `AlertDialog.Popup` to `document.body`, outside the Storybook canvas root --
// queries target the owner document's body rather than `within(canvasElement)`.
export const MidTyping: Story = {
  name: 'Typed but not matching',
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByLabelText('Type "ci-deploy" to confirm'), 'ci-dep');
    await waitFor(() => expect(body.getByRole('button', { name: 'Revoke' })).toBeDisabled());
  },
};

export const Matched: Story = {
  name: 'Exact match — primary enabled',
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByLabelText('Type "ci-deploy" to confirm'), 'ci-deploy');
    await waitFor(() => expect(body.getByRole('button', { name: 'Revoke' })).toBeEnabled());
  },
};

export const DeleteWithError: Story = {
  name: 'Stays open with an inline error on failure',
  args: {
    title: 'Delete legacy-import?',
    description:
      'Deleting removes the key record and its audit trail permanently. This cannot be undone — admin only.',
    objectName: 'legacy-import',
    confirmLabel: 'Delete',
    error: 'Could not delete the key — the server returned a 500. Nothing changed.',
  },
};
