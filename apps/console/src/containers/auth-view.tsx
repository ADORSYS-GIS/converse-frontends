'use client';

import type { AuthScreenStatus } from '@lightbridge/ui-web';
import { AuthScreen } from '@lightbridge/ui-web/src/sections/auth-screen';
import { useState } from 'react';

/**
 * The sign-in doorway, wrapping `ui-web`'s pure `AuthScreen`.
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
  status?: AuthScreenStatus;
  signedOutMessage?: string;
  errorMessage?: string;
  returnTo?: string;
}) {
  const [status, setStatus] = useState<AuthScreenStatus>(initialStatus);

  const startLogin = () => {
    setStatus('redirecting');
    const target = returnTo
      ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/auth/login';
    window.location.assign(target);
  };

  return (
    <AuthScreen
      status={status}
      onSignIn={startLogin}
      signedOutMessage={signedOutMessage}
      errorMessage={errorMessage}
      onRetry={status === 'error' ? startLogin : undefined}
    />
  );
}
