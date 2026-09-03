import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AuthScreen } from './component';
import { authCallbackErrorMessage, authSignedOutMessage } from './fixtures';

const meta: Meta<typeof AuthScreen> = {
  title: 'Sections/Auth/AuthScreen',
  component: AuthScreen,
  parameters: { layout: 'fullscreen' },
  args: { onSignIn: () => {} },
};

export default meta;
type Story = StoryObj<typeof AuthScreen>;

// README §5.5: wordmark -> page-title -> one line of Inter prose -> one primary button ->
// nothing else. Outside the shell entirely, `#000` floor, no rails.
export const Default: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen {...args} />
    </div>
  ),
};

// README §5.5 signed-out variant: same page, InlineStatus line above the button, `--muted`.
// Not a modal, not a toast.
export const SignedOut: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen {...args} signedOutMessage={authSignedOutMessage} />
    </div>
  ),
};

// README §5.5 redirect-in-flight: the button turns `--muted` with "Redirecting…"; no spinner.
export const Redirecting: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen {...args} status="redirecting" />
    </div>
  ),
};

// Phase 7 polish: the ErrorLine renders ABOVE the primary control (reason before decision), and
// there is exactly one control -- the primary button relabels itself "Try again" and calls
// `onRetry` rather than duplicating a second retry button under the ErrorLine. Never a raw OIDC
// error code.
export const CallbackError: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen
        {...args}
        status="error"
        errorMessage={authCallbackErrorMessage}
        onRetry={() => {}}
      />
    </div>
  ),
};

// Phase 7 polish: the subtle docs/support escape hatch under the primary control. Every current
// caller omits `supportHref` (no docs URL exists in the repo yet) -- this story is the one place
// proving the link itself renders correctly once a caller has a real URL to pass.
export const WithSupportLink: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen {...args} supportHref="https://docs.example.com/console/sign-in" />
    </div>
  ),
};

// Config-driven logo slot (ADR 0008 Decision 8) -- falls back to the wordmark when unset.
export const WithConfiguredLogo: Story = {
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen
        {...args}
        logoSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' rx='2' fill='%23DA5C2C'/%3E%3C/svg%3E"
        logoAlt="adorsys-gis"
      />
    </div>
  ),
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): Auth already
// renders as a single centred column capped at 360px with 24px (`px-6`) edge gutters and no
// fixed-pixel siblings, so the mobile-first ladder needs no component changes here — this story
// exists to prove that, at the smallest designed viewport, nothing clips or scrolls sideways.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen {...args} />
    </div>
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `CallbackError` -- the state with the
// most tokens in play (signal-coloured message, primary button), so this is the variant most
// likely to reveal a dark-only assumption.
export const CallbackErrorLight: Story = {
  name: 'Callback error — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: (args) => (
    <div className="bg-muted min-h-screen w-full">
      <AuthScreen
        {...args}
        status="error"
        errorMessage={authCallbackErrorMessage}
        onRetry={() => {}}
      />
    </div>
  ),
};
