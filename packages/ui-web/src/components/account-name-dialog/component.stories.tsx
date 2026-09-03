import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { AccountNameDialog } from './component';

const meta: Meta<typeof AccountNameDialog> = {
  title: 'Primitives/Overlays/AccountNameDialog',
  component: AccountNameDialog,
  args: {
    open: true,
    mode: 'create',
    subjectLabel: 'auth0|9f3a2c7e41b0',
    name: '',
    onNameChange: fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AccountNameDialog>;

/** The empty create form — one optional field, and the subject echoed rather than asked for. */
export const Default: Story = {};

// ADR 0010 phase 4: the `wireframe` (light) counterpart — the dialog portals to `document.body`,
// outside the canvas root the preview decorator wraps, so this confirms the backdrop/panel tokens
// re-resolve there too.
export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/**
 * A blank name is NOT a validation failure: `createAccount` normalises blank/whitespace-only input
 * to `NULL` server-side, so the primary stays enabled and the account is simply created unnamed.
 * This story exists to pin that, because "required field" is the reflex a reviewer would expect.
 */
export const BlankNameIsLegal: Story = {
  name: 'Blank name — legal, creates an unnamed account',
  args: { name: '   ' },
};

/**
 * The validation-failure state. It is server-attributed on purpose: the console adds no name rule
 * the backend does not have (the only DB constraint is `CHECK (name IS NULL OR btrim(name) <>
 * '')`, which the app layer normalises away first), so anything rejectable is rejected by the
 * server and routed back onto the field by `classifyAccountNameError`.
 */
export const NameRejected: Story = {
  name: 'Validation failure — server rejects the name, surfaced on the field',
  args: {
    name: 'Widgets Ltd',
    nameError: 'account name must not be blank once set',
  },
};

/**
 * The one `createAccount` `Error::Conflict` case ADR-0026 left standing: two concurrent bootstraps
 * racing to create the same identity's very first account — not "one subject, one account"
 * (killed by ADR-0026; a repeat `createAccount` call is an ordinary success now).
 */
export const ConcurrentBootstrapConflict: Story = {
  name: 'Server-rejected submit — concurrent first-account bootstrap race',
  args: {
    name: 'Widgets Ltd',
    error: 'account already exists for this subject',
  },
};

export const Submitting: Story = {
  name: 'In-flight submit',
  args: { name: 'Widgets Ltd', submitting: true },
};

export const RenameUnnamed: Story = {
  name: 'Rename — an account that has never been named',
  args: { mode: 'rename', currentlyNamed: false, subjectLabel: 'auth0|9f3a2c7e41b0', name: '' },
};

export const RenameNamed: Story = {
  name: 'Rename — an account that already has one',
  args: {
    mode: 'rename',
    currentlyNamed: true,
    subjectLabel: 'auth0|9f3a2c7e41b0',
    name: 'Widgets Ltd',
  },
};

export const RenameNothingToSave: Story = {
  name: 'Rename — unchanged, so there is nothing to submit',
  args: {
    mode: 'rename',
    currentlyNamed: true,
    subjectLabel: 'auth0|9f3a2c7e41b0',
    name: 'Widgets Ltd',
    canSubmit: false,
  },
};

export const RenameSubmitting: Story = {
  name: 'Rename — in-flight submit',
  args: {
    mode: 'rename',
    currentlyNamed: true,
    subjectLabel: 'auth0|9f3a2c7e41b0',
    name: 'Widgets International',
    submitting: true,
  },
};
