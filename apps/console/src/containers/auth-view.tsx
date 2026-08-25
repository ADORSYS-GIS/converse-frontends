'use client';

import type { AuthPageStatus } from '@lightbridge/ui-web';
import { AuthPage } from '@lightbridge/ui-web/src/pages/auth';
import { useState } from 'react';

/**
 * The sign-in doorway, wrapping `ui-web`'s pure `AuthPage`.
 *
 * `onSignIn` navigates to `/auth/login` — a **route handler**, not a page. The whole OIDC dance
 * (discovery, PKCE, the code exchange) happens server-side from there; this component never sees a
 * client id, a verifier or a token.
 */
export function AuthView({
  status: initialStatus = 'idle',
  signedOutMessage,
  errorMessage,
  returnTo,
}: {
  status?: AuthPageStatus;
  signedOutMessage?: string;
  errorMessage?: string;
  returnTo?: string;
}) {
  const [status, setStatus] = useState<AuthPageStatus>(initialStatus);

  const startLogin = () => {
    setStatus('redirecting');
    const target = returnTo
      ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/auth/login';
    window.location.assign(target);
  };

  return (
    <AuthPage
      status={status}
      onSignIn={startLogin}
      signedOutMessage={signedOutMessage}
      errorMessage={errorMessage}
      onRetry={status === 'error' ? startLogin : undefined}
    />
  );
}
