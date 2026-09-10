// Page-level acceptance stories for authz-idp's human plane device-pairing flow
// (lightbridge-authz#478, converse-frontends#409, converse-frontends#409's own "each page story
// lands before the corresponding route is implemented" review gate for PR-A2).
//
// Composes `AuthPanelShell` with the three CSP-safe device panels (`DeviceCodeEntry`,
// `DeviceConfirmation`) exactly as `apps/authz-ui`'s real routes will (PR-A2, not yet
// implemented) — console-ui skill "Composition": full-page compositions exist in exactly two
// places, Storybook and the real app's routes. This is the Storybook one.
//
// `/device/success` ("Device paired") needs no section of its own (plan A8) — it composes
// `AuthPanelShell` directly with one line of body copy and no control, matching the deleted
// server-rendered `callback`'s terminal page (`relying_party.rs`'s `Completion::Device` arm).
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuthPanelShell } from '../sections/auth-panel-shell';
import { DeviceCodeEntry } from '../sections/device-code-entry';
import {
  deviceCodeEntryAction,
  deviceCodeEntryInvalidCodeMessage,
  deviceCodeEntryPrefilledCode,
} from '../sections/device-code-entry/fixtures';
import { DeviceConfirmation } from '../sections/device-confirmation';
import type { DeviceConfirmationStatus } from '../sections/device-confirmation';
import {
  deviceConfirmationAction,
  deviceConfirmationClientName,
  deviceConfirmationErrorMessage,
  deviceConfirmationUserCode,
} from '../sections/device-confirmation/fixtures';
import { BODY_CLASS } from '../lib/type-roles';

const ENTRY_TITLE = 'Enter the code shown on your device';
const ENTRY_LEAD = 'Type the code exactly as it appears. Codes expire after a few minutes.';
const CONFIRM_TITLE = 'Confirm this device';
const CONFIRM_LEAD = "Make sure this is the device you're signing in on.";

interface DeviceEntryScreenProps {
  defaultUserCode?: string;
  errorMessage?: string;
}

function DeviceEntryScreen({ defaultUserCode, errorMessage }: DeviceEntryScreenProps) {
  return (
    <AuthPanelShell title={ENTRY_TITLE} lead={ENTRY_LEAD}>
      <DeviceCodeEntry
        action={deviceCodeEntryAction}
        defaultUserCode={defaultUserCode}
        errorMessage={errorMessage}
      />
    </AuthPanelShell>
  );
}

interface DeviceConfirmScreenProps {
  status?: DeviceConfirmationStatus;
  errorMessage?: string;
}

function DeviceConfirmScreen({ status, errorMessage }: DeviceConfirmScreenProps) {
  return (
    <AuthPanelShell title={CONFIRM_TITLE} lead={CONFIRM_LEAD}>
      <DeviceConfirmation
        status={status}
        action={deviceConfirmationAction}
        userCode={deviceConfirmationUserCode}
        clientName={deviceConfirmationClientName}
        errorMessage={errorMessage}
        backHref="/device"
      />
    </AuthPanelShell>
  );
}

function DeviceSuccessScreen() {
  return (
    <AuthPanelShell title="Device paired">
      <p className={BODY_CLASS}>You can return to your application.</p>
    </AuthPanelShell>
  );
}

const meta: Meta = {
  title: 'Pages/Auth/Device',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// ── code entry (`/device`, `/device/invalid`) ────────────────────────────────────────────────

export const Entry: Story = {
  render: () => <DeviceEntryScreen />,
};

// The `verification_uri_complete` pre-filled landing (RFC 8628, `?user_code=`) — the one query
// parameter this SPA ever reads (plan D4).
export const EntryPrefilled: Story = {
  name: 'Entry — pre-filled from verification_uri_complete',
  render: () => <DeviceEntryScreen defaultUserCode={deviceCodeEntryPrefilledCode} />,
};

export const EntryInvalidCode: Story = {
  name: 'Entry — invalid code (/device/invalid)',
  render: () => <DeviceEntryScreen errorMessage={deviceCodeEntryInvalidCodeMessage} />,
};

export const EntryLight: Story = {
  name: 'Entry — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <DeviceEntryScreen />,
};

export const EntryMobile: Story = {
  name: 'Entry — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <DeviceEntryScreen />,
};

// ── confirmation (`/device/confirm`) ─────────────────────────────────────────────────────────

export const Confirm: Story = {
  render: () => <DeviceConfirmScreen status="ready" />,
};

export const ConfirmLoading: Story = {
  name: 'Confirm — loading',
  render: () => <DeviceConfirmScreen status="loading" />,
};

export const ConfirmError: Story = {
  name: 'Confirm — error (confirmation no longer available)',
  render: () => (
    <DeviceConfirmScreen status="error" errorMessage={deviceConfirmationErrorMessage} />
  ),
};

export const ConfirmLight: Story = {
  name: 'Confirm — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <DeviceConfirmScreen status="ready" />,
};

export const ConfirmMobile: Story = {
  name: 'Confirm — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <DeviceConfirmScreen status="ready" />,
};

// ── terminal success (`/device/success`) ─────────────────────────────────────────────────────

export const Success: Story = {
  render: () => <DeviceSuccessScreen />,
};
