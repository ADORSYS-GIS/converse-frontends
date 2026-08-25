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
  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — in-flight submit state). This flips to
   * `'redirecting'` in the same handler that calls `window.location.assign`, so it exists for at
   * most one paint before the document is replaced by `/auth/login`. Writing it to the query
   * string would be a URL update racing a full navigation away from that URL — and `/auth` is
   * outside the `(console)` group, where there is no view to make shareable in the first place.
   */
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
