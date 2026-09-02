import { useEffect, useState } from 'react';

import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { META_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { AuthErrorPanel } from '@lightbridge/ui-web/src/sections/auth-error-panel';
import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';

import { CALLBACK_COPY, CLOSE_PENDING_HINT, CLOSE_REFUSED_HINT } from './callback-copy';
import type { CallbackStatus } from './callback-status';

/**
 * How long the page waits before attempting to close itself. Carried over from the Rust template:
 * long enough that the outcome can be read in the rare case the close actually works.
 */
export const CLOSE_ATTEMPT_DELAY_MS = 1200;

export interface CallbackPageProps {
  /** The outcome the Rust side already decided — see `callback-status.ts`. */
  status: CallbackStatus;
}

/**
 * `true` once the close attempt has run, which for a tab the user navigated to means it was
 * refused. Not a "did it work" signal — if it worked there is no page left to re-render.
 */
function useCloseAttempt(): boolean {
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // Expected. Browsers allow close() only on script-opened windows and this tab was
        // reached by a redirect, so the line below is the real answer, not a fallback.
      }
      setAttempted(true);
    }, CLOSE_ATTEMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return attempted;
}

/**
 * The whole app: one panel, two possible outcomes, no navigation and no fetch.
 *
 * Composed from `packages/ui-web` only — `AuthPanelShell` for the auth-plane layout (the same one
 * `apps/authz-ui`'s device pages render into), `AuthErrorPanel` for the failure statement, and
 * `InlineStatus` for the success statement and the close hint. Nothing here declares a Tailwind
 * class of its own; `META_CLASS` steps the hint down one type role, which is the only visual
 * decision this file makes.
 *
 * NO STATUS ICON, and no signal colour on the success path. ADR 0008's status-as-text rule
 * (unchanged by ADR 0012, console-ui skill) is what the Rust template's green/red circled glyph
 * traded away, and it is also the accessibility answer: the outcome is the *heading*, and the
 * statement under it is announced (`role="alert"` for failure, `role="status"` for success), so
 * nothing about the outcome is carried by colour.
 */
export function CallbackPage({ status }: CallbackPageProps) {
  const closeAttempted = useCloseAttempt();
  const { heading, detail } = CALLBACK_COPY[status];

  return (
    <AuthPanelShell title={heading}>
      {status === 'success' ? (
        <InlineStatus>{detail}</InlineStatus>
      ) : (
        <AuthErrorPanel message={detail} />
      )}

      <InlineStatus className={META_CLASS}>
        {closeAttempted ? CLOSE_REFUSED_HINT : CLOSE_PENDING_HINT}
      </InlineStatus>
    </AuthPanelShell>
  );
}
