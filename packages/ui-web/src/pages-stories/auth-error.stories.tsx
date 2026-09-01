// Page-level acceptance stories for authz-idp's human plane RP-leg failure page (`/ui/error`,
// lightbridge-authz#478, converse-frontends#409). Plan D8: every former 400/403/404/502/503
// RP-leg failure response collapses to one 303 into this page; the distinction is preserved in
// server logs (`reason=...`), not in HTTP or in this page's copy.
//
// Composes `AuthPanelShell` with `AuthErrorPanel` exactly as `apps/authz-ui`'s real `/error`
// route will (PR-A2, not yet implemented) — console-ui skill "Composition".
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuthPanelShell } from '../sections/auth-panel-shell';
import { AuthErrorPanel } from '../sections/auth-error-panel';
import { authErrorPanelRetryHref } from '../sections/auth-error-panel/fixtures';

interface AuthErrorScreenProps {
  retryHref?: string;
}

// D1's own copy for this route: "Sign-in unavailable" — the page title never restates the
// underlying reason, which lives in the panel's own sentence-case message (auth-screen's own
// rule: never a raw OIDC error code).
function AuthErrorScreen({ retryHref }: AuthErrorScreenProps) {
  return (
    <AuthPanelShell title="Sign-in unavailable">
      <AuthErrorPanel retryHref={retryHref} />
    </AuthPanelShell>
  );
}

const meta: Meta = {
  title: 'Pages/AuthError',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <AuthErrorScreen />,
};

export const WithRetryLink: Story = {
  render: () => <AuthErrorScreen retryHref={authErrorPanelRetryHref} />,
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <AuthErrorScreen retryHref={authErrorPanelRetryHref} />,
};

export const DefaultMobile: Story = {
  name: 'Default — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <AuthErrorScreen retryHref={authErrorPanelRetryHref} />,
};
